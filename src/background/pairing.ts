/**
 * Pending pairing-offer store (service worker side).
 *
 * A page can *offer* a connection config, but the extension never applies it
 * automatically — it parks the latest offer here, badges the toolbar icon, and
 * waits for the user to confirm in the popup. The offer lives in
 * `chrome.storage.session` so it survives the service worker being idled but is
 * dropped when the browser closes (it should never outlive the tab that asked).
 */

import type { PairOffer } from "../shared/pairing";

const PENDING_KEY = "pendingPairOffer";
const BADGE_TEXT = "1";
const BADGE_COLOR = "#0f8a9c";

export class PairingManager {
  /** Park an offer and badge the toolbar icon. */
  async setPending(offer: PairOffer): Promise<void> {
    await chrome.storage.session.set({ [PENDING_KEY]: offer });
    await chrome.action.setBadgeText({ text: BADGE_TEXT });
    try {
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    } catch {
      /* badge color is cosmetic; ignore if unsupported */
    }
  }

  /** The currently parked offer, if any. */
  async getPending(): Promise<PairOffer | null> {
    const stored = await chrome.storage.session.get(PENDING_KEY);
    return (stored[PENDING_KEY] as PairOffer | undefined) ?? null;
  }

  /** Drop the parked offer and clear the badge. */
  async clear(): Promise<void> {
    await chrome.storage.session.remove(PENDING_KEY);
    await chrome.action.setBadgeText({ text: "" });
  }
}
