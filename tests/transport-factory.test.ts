import { describe, expect, it } from "vitest";
import { TokenAuth } from "../src/background/auth/token-auth";
import { buildAuth, buildTransport } from "../src/background/transport/factory";
import { SseHttpTransport } from "../src/background/transport/sse-http-transport";
import { WebSocketTransport } from "../src/background/transport/websocket-transport";
import { DEFAULT_CONFIG, type ConnectionConfig } from "../src/config/connection-config";

const callbacks = { onCommand: () => {}, onStatus: () => {} };

describe("buildAuth", () => {
  it("builds TokenAuth from a config", () => {
    expect(buildAuth(DEFAULT_CONFIG)).toBeInstanceOf(TokenAuth);
  });
});

describe("buildTransport", () => {
  const auth = new TokenAuth(DEFAULT_CONFIG);

  it("selects SseHttpTransport for sse-http", () => {
    const config: ConnectionConfig = { ...DEFAULT_CONFIG, transport: "sse-http" };
    expect(buildTransport(config, auth, callbacks)).toBeInstanceOf(SseHttpTransport);
  });

  it("selects WebSocketTransport for websocket", () => {
    const config: ConnectionConfig = { ...DEFAULT_CONFIG, transport: "websocket" };
    expect(buildTransport(config, auth, callbacks)).toBeInstanceOf(WebSocketTransport);
  });
});
