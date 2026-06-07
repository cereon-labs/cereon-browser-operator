/**
 * Owns the per-tab CDP sessions and the single debugger event listener.
 *
 * Hands out {@link CdpSession}s on demand, fans CDP events out to its observers,
 * and tears everything down when a tab closes or Chrome detaches the debugger.
 * Tools reach console/network history through the exposed observers.
 */

import { logger } from "../../shared/logger";
import { CdpSession } from "./cdp-session";
import type { CdpEventObserver } from "./observers/cdp-event-observer";
import { ConsoleObserver } from "./observers/console-observer";
import { NetworkObserver } from "./observers/network-observer";

const log = logger.child("cdp-manager");

export class CdpSessionManager {
  private readonly sessions = new Map<number, CdpSession>();
  readonly console = new ConsoleObserver();
  readonly network = new NetworkObserver();
  private readonly observers: CdpEventObserver[] = [this.console, this.network];

  /** Get (or lazily create) the session for a tab. */
  session(tabId: number): CdpSession {
    let session = this.sessions.get(tabId);
    if (!session) {
      session = new CdpSession(tabId);
      this.sessions.set(tabId, session);
    }
    return session;
  }

  /** Register the chrome.debugger / tabs listeners. Call once at startup. */
  registerListeners(): void {
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (source.tabId === undefined) return;
      for (const observer of this.observers) {
        observer.handle(source.tabId, method, params as any);
      }
    });

    chrome.debugger.onDetach.addListener((source) => {
      if (source.tabId !== undefined) {
        this.sessions.get(source.tabId)?.markDetached();
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      void this.dropTab(tabId);
    });
  }

  private async dropTab(tabId: number): Promise<void> {
    const session = this.sessions.get(tabId);
    if (session) {
      await session.detach();
      this.sessions.delete(tabId);
    }
    for (const observer of this.observers) observer.dropTab(tabId);
    log.debug(`dropped tab ${tabId}`);
  }
}
