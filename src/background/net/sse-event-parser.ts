/**
 * Incremental Server-Sent-Events parser.
 *
 * Fed arbitrary decoded chunks, it buffers partial lines across calls and emits
 * one `{ event, data }` per `data:` line, tagged with the most recent `event:`
 * type (reset to "message" on a blank line). This is the structural half of the
 * SSE protocol with no knowledge of command JSON — which makes it a pure,
 * heavily-testable unit.
 */

export interface SseEvent {
  event: string;
  data: string;
}

const EVENT_PREFIX = "event: ";
const DATA_PREFIX = "data: ";

export class SseEventParser {
  private buffer = "";
  private currentEvent = "message";

  /** Feed a decoded chunk; returns any complete events it produced. */
  push(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    const events: SseEvent[] = [];
    for (const line of lines) {
      if (line.startsWith(EVENT_PREFIX)) {
        this.currentEvent = line.slice(EVENT_PREFIX.length).trim();
        continue;
      }
      if (line === "") {
        this.currentEvent = "message";
        continue;
      }
      if (line.startsWith(DATA_PREFIX)) {
        events.push({ event: this.currentEvent, data: line.slice(DATA_PREFIX.length) });
      }
    }
    return events;
  }

  reset(): void {
    this.buffer = "";
    this.currentEvent = "message";
  }
}
