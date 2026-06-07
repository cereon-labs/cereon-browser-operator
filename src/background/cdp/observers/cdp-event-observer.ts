/**
 * Observer contract for CDP events.
 *
 * The {@link CdpSessionManager} owns the single chrome.debugger.onEvent listener
 * and fans each event out to registered observers. Adding a new capture (e.g.
 * DOM mutations) is then a matter of writing one observer — no edits to the
 * event-routing code (Open/Closed).
 */
export interface CdpEventObserver {
  /** Handle one CDP event for a tab. Implementations cherry-pick methods. */
  handle(tabId: number, method: string, params: any): void;
  /** Release any per-tab state when a tab closes. */
  dropTab(tabId: number): void;
}
