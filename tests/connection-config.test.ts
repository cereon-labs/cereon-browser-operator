import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  resolvePath,
  validateConfig,
  type ConnectionConfig,
} from "../src/config/connection-config";

const base: ConnectionConfig = {
  transport: "sse-http",
  serverUrl: "https://api.example.com",
  commandPath: "/browser/events",
  resultPath: "/browser/result",
  token: "tok",
};

describe("validateConfig", () => {
  it("accepts a complete token + sse-http config", () => {
    expect(validateConfig(base)).toEqual([]);
  });

  it("flags a missing server URL and token (defaults)", () => {
    const errors = validateConfig(DEFAULT_CONFIG);
    expect(errors).toContain("Server URL is required.");
    expect(errors).toContain("A token is required.");
  });

  it("requires ws(s):// for the WebSocket transport", () => {
    const errors = validateConfig({ ...base, transport: "websocket", serverUrl: "https://x" });
    expect(errors.some((e) => e.includes("ws://"))).toBe(true);
  });

  it("accepts a ws:// URL for WebSocket without sse paths", () => {
    expect(
      validateConfig({
        transport: "websocket",
        serverUrl: "ws://localhost:8787",
        commandPath: "",
        resultPath: "",
        token: "t",
      }),
    ).toEqual([]);
  });
});

describe("resolvePath", () => {
  it("substitutes {target}", () => {
    expect(resolvePath("/api/v1/workspaces/{target}/events", "ws_1")).toBe(
      "/api/v1/workspaces/ws_1/events",
    );
  });

  it("substitutes an empty string when target is absent", () => {
    expect(resolvePath("/a/{target}/b")).toBe("/a//b");
  });

  it("leaves paths without a placeholder untouched", () => {
    expect(resolvePath("/browser/events", "x")).toBe("/browser/events");
  });
});
