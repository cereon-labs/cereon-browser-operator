import { describe, expect, it } from "vitest";
import {
  PAIR_MESSAGE_KEY,
  offerToConfig,
  parsePairOffer,
  parsePing,
  parsePong,
} from "../src/shared/pairing";

const validOffer = {
  [PAIR_MESSAGE_KEY]: "pair-offer",
  config: {
    transport: "sse-http",
    serverUrl: "https://app.example.com",
    token: "ts_abc123",
  },
  brand: { name: "Example CRM" },
};

describe("parsePairOffer", () => {
  it("accepts a well-formed sse-http offer with brand", () => {
    const parsed = parsePairOffer(validOffer);
    expect(parsed).not.toBeNull();
    expect(parsed!.config).toEqual({
      transport: "sse-http",
      serverUrl: "https://app.example.com",
      token: "ts_abc123",
    });
    expect(parsed!.brand).toEqual({ name: "Example CRM" });
  });

  it("accepts a websocket offer and optional paths/target", () => {
    const parsed = parsePairOffer({
      [PAIR_MESSAGE_KEY]: "pair-offer",
      config: {
        transport: "websocket",
        serverUrl: "ws://localhost:8787",
        token: "dev-token",
        commandPath: "/events",
        resultPath: "/result",
        target: "chan-1",
      },
    });
    expect(parsed!.config.transport).toBe("websocket");
    expect(parsed!.config.commandPath).toBe("/events");
    expect(parsed!.config.target).toBe("chan-1");
    expect(parsed!.brand).toBeUndefined();
  });

  it("rejects non-objects and wrong marker/kind", () => {
    expect(parsePairOffer(null)).toBeNull();
    expect(parsePairOffer("x")).toBeNull();
    expect(parsePairOffer({ [PAIR_MESSAGE_KEY]: "ping" })).toBeNull();
    expect(parsePairOffer({ config: validOffer.config })).toBeNull();
  });

  it("rejects an unknown transport", () => {
    expect(
      parsePairOffer({
        [PAIR_MESSAGE_KEY]: "pair-offer",
        config: { transport: "carrier-pigeon", serverUrl: "x", token: "y" },
      }),
    ).toBeNull();
  });

  it("rejects a missing or empty serverUrl/token", () => {
    expect(
      parsePairOffer({
        [PAIR_MESSAGE_KEY]: "pair-offer",
        config: { transport: "sse-http", serverUrl: "", token: "y" },
      }),
    ).toBeNull();
    expect(
      parsePairOffer({
        [PAIR_MESSAGE_KEY]: "pair-offer",
        config: { transport: "sse-http", serverUrl: "https://x", token: 42 },
      }),
    ).toBeNull();
  });

  it("ignores a non-string brand name", () => {
    const parsed = parsePairOffer({ ...validOffer, brand: { name: 123 } });
    expect(parsed!.brand).toBeUndefined();
  });
});

describe("offerToConfig", () => {
  it("merges the offer over the defaults", () => {
    const config = offerToConfig({
      transport: "sse-http",
      serverUrl: "https://app.example.com",
      token: "ts_abc123",
    });
    // Default endpoint paths survive when the offer omits them.
    expect(config.commandPath).toBe("/browser/events");
    expect(config.resultPath).toBe("/browser/result");
    expect(config.token).toBe("ts_abc123");
  });
});

describe("parsePing / parsePong", () => {
  it("parses a ping with and without a nonce", () => {
    expect(parsePing({ [PAIR_MESSAGE_KEY]: "ping", nonce: "n1" })).toEqual({ nonce: "n1" });
    expect(parsePing({ [PAIR_MESSAGE_KEY]: "ping" })).toEqual({ nonce: null });
    expect(parsePing({ [PAIR_MESSAGE_KEY]: "pair-offer" })).toBeNull();
  });

  it("parses a well-formed pong and rejects incomplete ones", () => {
    expect(
      parsePong({ [PAIR_MESSAGE_KEY]: "pong", nonce: "n1", version: "2.1.0", productName: "X" }),
    ).toEqual({ nonce: "n1", version: "2.1.0", productName: "X" });
    expect(parsePong({ [PAIR_MESSAGE_KEY]: "pong", version: "2.1.0" })).toBeNull();
    expect(parsePong({ [PAIR_MESSAGE_KEY]: "ping" })).toBeNull();
  });
});
