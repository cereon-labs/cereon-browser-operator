/**
 * Captures network activity per tab.
 *
 * Correlates `Network.requestWillBeSent` with `Network.responseReceived` by
 * `requestId` so the recorded method AND status are accurate. The original code
 * created two unrelated rows per request and hard-coded `method: "?" | "GET"` on
 * the response row — this observer fixes that by updating one row in place.
 */

import { LIMITS } from "../../../shared/constants";
import { RingBuffer } from "../../../shared/ring-buffer";
import type { CdpEventObserver } from "./cdp-event-observer";

export interface NetworkEntry {
  url: string;
  method: string;
  status: number;
  statusText?: string;
  type: string;
  mimeType?: string;
  timestamp: number;
}

interface TabNetwork {
  buffer: RingBuffer<NetworkEntry>;
  /** In-flight requests awaiting a response, keyed by CDP requestId. */
  inFlight: Map<string, NetworkEntry>;
}

export class NetworkObserver implements CdpEventObserver {
  private readonly byTab = new Map<number, TabNetwork>();

  handle(tabId: number, method: string, params: any): void {
    if (method === "Network.requestWillBeSent" && params.request) {
      const entry: NetworkEntry = {
        url: params.request.url,
        method: params.request.method,
        status: 0,
        type: params.type ?? "Other",
        timestamp: Date.now(),
      };
      const tab = this.tab(tabId);
      tab.buffer.push(entry);
      if (params.requestId) tab.inFlight.set(params.requestId, entry);
      this.pruneInFlight(tab);
    } else if (method === "Network.responseReceived" && params.response) {
      const tab = this.tab(tabId);
      const existing = params.requestId ? tab.inFlight.get(params.requestId) : undefined;
      if (existing) {
        existing.status = params.response.status;
        existing.statusText = params.response.statusText;
        existing.mimeType = params.response.mimeType;
        existing.type = params.type ?? existing.type;
        tab.inFlight.delete(params.requestId);
      } else {
        // Response without a matching request (e.g. capture started mid-flight).
        tab.buffer.push({
          url: params.response.url,
          method: "GET",
          status: params.response.status,
          statusText: params.response.statusText,
          type: params.type ?? "Other",
          mimeType: params.response.mimeType,
          timestamp: Date.now(),
        });
      }
    }
  }

  snapshot(tabId: number): NetworkEntry[] {
    return this.byTab.get(tabId)?.buffer.toArray() ?? [];
  }

  clear(tabId: number): void {
    const tab = this.byTab.get(tabId);
    if (tab) {
      tab.buffer.clear();
      tab.inFlight.clear();
    }
  }

  dropTab(tabId: number): void {
    this.byTab.delete(tabId);
  }

  private tab(tabId: number): TabNetwork {
    let tab = this.byTab.get(tabId);
    if (!tab) {
      tab = {
        buffer: new RingBuffer<NetworkEntry>(LIMITS.networkRequests),
        inFlight: new Map(),
      };
      this.byTab.set(tabId, tab);
    }
    return tab;
  }

  /** Keep the correlation map from growing without bound on responseless requests. */
  private pruneInFlight(tab: TabNetwork): void {
    if (tab.inFlight.size <= LIMITS.networkRequests) return;
    const oldest = tab.inFlight.keys().next().value;
    if (oldest !== undefined) tab.inFlight.delete(oldest);
  }
}
