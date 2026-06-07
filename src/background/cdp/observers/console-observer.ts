/**
 * Captures console output per tab into bounded buffers.
 *
 * Listens to both `Console.messageAdded` (browser-emitted) and
 * `Runtime.consoleAPICalled` (page `console.*` calls); the original code
 * duplicated the buffer-append logic for each — here a shared private `record`
 * and a {@link RingBuffer} remove that repetition.
 */

import { LIMITS } from "../../../shared/constants";
import { RingBuffer } from "../../../shared/ring-buffer";
import type { CdpEventObserver } from "./cdp-event-observer";

export interface ConsoleEntry {
  level: string;
  text: string;
  url: string;
  timestamp: number;
}

export class ConsoleObserver implements CdpEventObserver {
  private readonly byTab = new Map<number, RingBuffer<ConsoleEntry>>();

  handle(tabId: number, method: string, params: any): void {
    if (method === "Console.messageAdded" && params.message) {
      this.record(tabId, {
        level: params.message.level,
        text: params.message.text,
        url: params.message.url ?? "",
        timestamp: Date.now(),
      });
    } else if (method === "Runtime.consoleAPICalled" && params.args) {
      this.record(tabId, {
        level: params.type ?? "log",
        text: params.args.map((a: any) => a.value ?? a.description ?? "").join(" "),
        url: params.stackTrace?.callFrames?.[0]?.url ?? "",
        timestamp: Date.now(),
      });
    }
  }

  /** Snapshot of captured messages for a tab (oldest first). */
  snapshot(tabId: number): ConsoleEntry[] {
    return this.byTab.get(tabId)?.toArray() ?? [];
  }

  clear(tabId: number): void {
    this.byTab.get(tabId)?.clear();
  }

  dropTab(tabId: number): void {
    this.byTab.delete(tabId);
  }

  private record(tabId: number, entry: ConsoleEntry): void {
    let buffer = this.byTab.get(tabId);
    if (!buffer) {
      buffer = new RingBuffer<ConsoleEntry>(LIMITS.consoleMessages);
      this.byTab.set(tabId, buffer);
    }
    buffer.push(entry);
  }
}
