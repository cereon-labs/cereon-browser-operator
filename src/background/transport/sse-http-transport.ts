/**
 * Remote transport: inbound commands over Server-Sent Events, outbound results
 * over an HTTP POST. This is the model the original Cereon integration used,
 * generalized so the URLs and auth come from config + the AuthProvider.
 */

import { resolvePath, type ConnectionConfig } from "../../config/connection-config";
import { sleep } from "../../shared/async";
import { SseError, toMessage } from "../../shared/errors";
import { logger } from "../../shared/logger";
import type { CommandMessage, CommandResult } from "../../shared/messages";
import type { AuthProvider } from "../auth/auth-provider";
import type { BackoffStrategy } from "../net/backoff";
import { SseEventParser } from "../net/sse-event-parser";
import type { Transport, TransportCallbacks } from "./transport";

const log = logger.child("sse-http");

export class SseHttpTransport implements Transport {
  private running = false;
  private controller: AbortController | null = null;

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
    void this.loop(state.token, state.meta?.target ?? this.config.target);
  }

  stop(): void {
    this.running = false;
    this.controller?.abort();
    this.controller = null;
  }

  async sendResult(result: CommandResult): Promise<void> {
    const state = await this.auth.current();
    if (!state) return;
    const url =
      this.config.serverUrl +
      resolvePath(this.config.resultPath, state.meta?.target ?? this.config.target);
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify(result),
      });
    } catch (err) {
      log.warn(`result POST failed for ${result.commandId}`, toMessage(err));
    }
  }

  private async loop(token: string, target?: string): Promise<void> {
    while (this.running) {
      try {
        await this.connectAndConsume(token, target);
      } catch (err) {
        if (!this.running) break;
        if (err instanceof DOMException && err.name === "AbortError") break;
        const delay = this.backoff.next();
        log.warn(`reconnecting in ${delay}ms`, toMessage(err));
        this.callbacks.onStatus({ connected: false, error: `Reconnecting… (${toMessage(err)})` });
        await sleep(delay);
      }
    }
    this.callbacks.onStatus({ connected: false });
  }

  private async connectAndConsume(token: string, target?: string): Promise<void> {
    this.controller = new AbortController();
    const url = this.config.serverUrl + resolvePath(this.config.commandPath, target);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: this.controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.handleRevoked();
        return;
      }
      throw new SseError(`SSE connect failed: ${response.status}`);
    }
    if (!response.body) throw new SseError("SSE response had no body.");

    this.backoff.reset();
    this.callbacks.onStatus({ connected: true });
    await this.readStream(response.body);
  }

  private async readStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseEventParser();

    while (this.running) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const evt of parser.push(decoder.decode(value, { stream: true }))) {
        if (evt.event === "disconnect") {
          await this.handleServerDisconnect();
          return;
        }
        this.dispatch(evt.data);
      }
    }
  }

  private dispatch(data: string): void {
    let parsed: Partial<CommandMessage>;
    try {
      parsed = JSON.parse(data);
    } catch {
      log.debug("skipping malformed SSE data line");
      return;
    }
    if (parsed.id && parsed.tool) {
      this.callbacks.onCommand({ id: parsed.id, tool: parsed.tool, args: parsed.args ?? {} });
    }
  }

  private async handleRevoked(): Promise<void> {
    await this.auth.clear();
    this.running = false;
    this.callbacks.onStatus({
      connected: false,
      error: "Token revoked. Reconnect to re-authenticate.",
    });
  }

  private async handleServerDisconnect(): Promise<void> {
    this.stop();
    await this.auth.clear();
    this.callbacks.onStatus({ connected: false, error: "Disconnected by the server." });
  }
}
