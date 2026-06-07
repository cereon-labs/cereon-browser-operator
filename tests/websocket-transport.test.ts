import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocketTransport } from "../src/background/transport/websocket-transport";
import { ExponentialBackoff } from "../src/background/net/backoff";
import type { AuthProvider } from "../src/background/auth/auth-provider";
import { DEFAULT_CONFIG, type ConnectionConfig } from "../src/config/connection-config";
import type { CommandMessage } from "../src/shared/messages";

/** Controllable fake of the WebSocket the transport opens. */
class FakeWebSocket {
  static OPEN = 1;
  static last: FakeWebSocket | null = null;

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.last = this;
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3;
  }
  // test helpers
  simulateOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
  simulateMessage(obj: unknown): void {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
}

const config: ConnectionConfig = {
  ...DEFAULT_CONFIG,
  transport: "websocket",
  serverUrl: "ws://localhost:8787",
};
const auth: AuthProvider = {
  authorize: async () => ({ token: "tok", meta: { target: "chan" } }),
  current: async () => ({ token: "tok", meta: { target: "chan" } }),
  clear: async () => {},
};

beforeEach(() => {
  FakeWebSocket.last = null;
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

describe("WebSocketTransport", () => {
  it("authenticates on open and reports connected", async () => {
    const statuses: { connected: boolean }[] = [];
    const transport = new WebSocketTransport(config, auth, new ExponentialBackoff(), {
      onCommand: () => {},
      onStatus: (s) => statuses.push(s),
    });

    await transport.start();
    const ws = FakeWebSocket.last!;
    ws.simulateOpen();

    expect(JSON.parse(ws.sent[0]!)).toEqual({ type: "auth", token: "tok", target: "chan" });
    expect(statuses.at(-1)).toEqual({ connected: true });
    expect(transport.isRunning).toBe(true);
  });

  it("forwards command frames to onCommand", async () => {
    const commands: CommandMessage[] = [];
    const transport = new WebSocketTransport(config, auth, new ExponentialBackoff(), {
      onCommand: (c) => commands.push(c),
      onStatus: () => {},
    });

    await transport.start();
    const ws = FakeWebSocket.last!;
    ws.simulateOpen();
    ws.simulateMessage({ type: "command", id: "1", tool: "navigate", args: { url: "x" } });

    expect(commands).toEqual([{ id: "1", tool: "navigate", args: { url: "x" } }]);
  });

  it("sends results as result frames when open", async () => {
    const transport = new WebSocketTransport(config, auth, new ExponentialBackoff(), {
      onCommand: () => {},
      onStatus: () => {},
    });

    await transport.start();
    const ws = FakeWebSocket.last!;
    ws.simulateOpen();
    await transport.sendResult({
      commandId: "1",
      result: { content: [{ type: "text", text: "ok" }] },
    });

    const frame = JSON.parse(ws.sent.at(-1)!);
    expect(frame.type).toBe("result");
    expect(frame.commandId).toBe("1");
    expect(frame.result.content[0].text).toBe("ok");
  });

  it("does not connect when unauthenticated", async () => {
    const noAuth: AuthProvider = {
      authorize: async () => ({ token: "" }),
      current: async () => null,
      clear: async () => {},
    };
    const statuses: { connected: boolean }[] = [];
    const transport = new WebSocketTransport(config, noAuth, new ExponentialBackoff(), {
      onCommand: () => {},
      onStatus: (s) => statuses.push(s),
    });

    await transport.start();
    expect(FakeWebSocket.last).toBeNull();
    expect(transport.isRunning).toBe(false);
    expect(statuses).toEqual([{ connected: false }]);
  });
});
