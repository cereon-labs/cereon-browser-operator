import { describe, expect, it } from "vitest";
import { SseEventParser } from "../src/background/net/sse-event-parser";

describe("SseEventParser", () => {
  it("emits one event per data line, defaulting to 'message'", () => {
    const parser = new SseEventParser();
    const events = parser.push('data: {"id":"1","tool":"navigate"}\n\n');
    expect(events).toEqual([{ event: "message", data: '{"id":"1","tool":"navigate"}' }]);
  });

  it("tags data with the preceding event type", () => {
    const parser = new SseEventParser();
    const events = parser.push("event: disconnect\ndata: bye\n\n");
    expect(events).toEqual([{ event: "disconnect", data: "bye" }]);
  });

  it("resets the event type after a blank line", () => {
    const parser = new SseEventParser();
    const events = parser.push("event: disconnect\ndata: bye\n\ndata: hello\n\n");
    expect(events).toEqual([
      { event: "disconnect", data: "bye" },
      { event: "message", data: "hello" },
    ]);
  });

  it("buffers a partial line across chunks", () => {
    const parser = new SseEventParser();
    expect(parser.push("data: par")).toEqual([]);
    expect(parser.push("tial\n")).toEqual([{ event: "message", data: "partial" }]);
  });

  it("ignores lines that are neither event: nor data:", () => {
    const parser = new SseEventParser();
    expect(parser.push(": keep-alive comment\nid: 7\n")).toEqual([]);
  });
});
