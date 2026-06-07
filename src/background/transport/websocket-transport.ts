/**
 * Local-first transport: a single WebSocket carries commands inbound and results
 * outbound. Ideal for a backend running on localhost (a CLI, agent, or dev
 * server) with no cloud round-trip.
 *
 * Frame protocol (JSON), documented in PROTOCOL.md:
 *   client → server (first frame): { type: "auth", token, target? }
 *   server → client:               { type: "command", id, tool, args }
 *   client → server:               { type: "result", commandId, result | error }
 *   server → client (optional):    { type: "auth_ok" } | { type: "error", message }
 * A close code of 4001 means auth was rejected (the token is cleared, no retry).
 */

import { type ConnectionConfig } from "../../config/connection-config";
import { toMessage } from "../../shared/errors";
import { logger } from "../../shared/logger";
import type { CommandResult } from "../../shared/messages";
import type { AuthProvider } from "../auth/auth-provider";
import type { BackoffStrategy } from "../net/backoff";
import type { Transport, TransportCallbacks } from "./transport";

const log = logger.child("websocket");
const AUTH_REJECTED_CODE = 4001;

export class WebSocketTransport implements Transport {
  private running = false;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly config: ConnectionConfig,
    private readonly auth: AuthProvider,
    private readonly backoff: BackoffStrategy,
    private readonly callbacks: TransportCallbacks,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    const state = await this.auth.current();
    if (!state) {
      this.callbacks.onStatus({ connected: false });
      return;
    }
    this.running = true;
    this.backoff.reset();
    await this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  async sendResult(result: CommandResult): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      log.warn(`cannot send result for ${result.commandId}: socket not open`);
      return;
    }
    try {
      this.socket.send(JSON.stringify({ type: "result", ...result }));
    } catch (err) {
      log.warn(`result send failed for ${result.commandId}`, toMessage(err));
    }
  }

  private async connect(): Promise<void> {
    const state = await this.auth.current();
    if (!state) {
      this.running = false;
      this.callbacks.onStatus({ connected: false });
      return;
    }

    const socket = new WebSocket(this.config.serverUrl);
    this.socket = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "auth",
          token: state.token,
          target: state.meta?.target ?? this.config.target,
        }),
      );
      this.backoff.reset();
      this.callbacks.onStatus({ connected: true });
    };

    socket.onmessage = (event) => this.onMessage(event.data);

    socket.onclose = (event) => {
      if (!this.running) return;
      if (event.code === AUTH_REJECTED_CODE) {
        void this.handleRevoked();
        return;
      }
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // `onclose` always follows `onerror`; reconnect is handled there.
      log.debug("socket error");
    };
  }

  private onMessage(data: unknown): void {
    if (typeof data !== "string") return;
    let frame: {
      type?: string;
      id?: string;
      tool?: string;
      args?: Record<string, unknown>;
      message?: string;
    };
    try {
      frame = JSON.parse(data);
    } catch {
      log.debug("skipping non-JSON frame");
      return;
    }

    if (frame.type === "command" && frame.id && frame.tool) {
      this.callbacks.onCommand({ id: frame.id, tool: frame.tool, args: frame.args ?? {} });
    } else if (frame.type === "error") {
      log.warn("server error frame", frame.message);
      this.callbacks.onStatus({ connected: false, error: frame.message ?? "Server error" });
    }
    // "auth_ok" needs no action — `onopen` already reported connected.
  }

  private scheduleReconnect(): void {
    const delay = this.backoff.next();
    log.warn(`reconnecting in ${delay}ms`);
    this.callbacks.onStatus({ connected: false, error: "Reconnecting…" });
    this.reconnectTimer = setTimeout(() => {
      if (this.running) void this.connect();
    }, delay);
  }

  private async handleRevoked(): Promise<void> {
    await this.auth.clear();
    this.running = false;
    this.socket = null;
    this.callbacks.onStatus({
      connected: false,
      error: "Token rejected. Reconnect to re-authenticate.",
    });
  }
}
