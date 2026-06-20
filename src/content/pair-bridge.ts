/**
 * Pairing bridge (page ↔ service worker / page).
 *
 * The content script is the only context that can hear a page's
 * `window.postMessage`. It does two vendor-neutral things:
 *
 *   1. pair-offer  — when a page offers a connection config, validate the shape,
 *      stamp the *trusted* event origin, and relay it to the service worker. The
 *      worker never auto-applies it (the user confirms in the popup), so a hostile
 *      page can at most surface a confirm prompt, not reconfigure anything.
 *   2. ping → pong — answer a presence probe so any backend page can detect that
 *      the extension is installed *without knowing its id*. The reply carries only
 *      version + product name; never the connection state or any secret.
 */

import { brand } from "../shared/brand";
import { PAIR_MESSAGE_KEY, PAIR_PONG_KIND, parsePairOffer, parsePing } from "../shared/pairing";

export function registerPairBridge(): void {
  window.addEventListener("message", (event: MessageEvent) => {
    // Only same-window, same-origin top-frame messages. Rejects offers/pings
    // posted by cross-origin iframes embedded in the page.
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;

    // 1. Presence probe → reply with a pong on the same window.
    const ping = parsePing(event.data);
    if (ping) {
      window.postMessage(
        {
          [PAIR_MESSAGE_KEY]: PAIR_PONG_KIND,
          nonce: ping.nonce,
          version: chrome.runtime.getManifest().version,
          productName: brand.productName,
        },
        window.location.origin,
      );
      return;
    }

    // 2. Pairing offer → relay to the worker (fire-and-forget; it parks it and
    //    badges the toolbar icon). No response is expected.
    const offer = parsePairOffer(event.data);
    if (!offer) return;
    void chrome.runtime
      .sendMessage({
        type: "pairOffer",
        origin: event.origin,
        config: offer.config,
        brand: offer.brand,
      })
      .catch(() => {
        /* worker asleep / no receiver — the page can re-send. */
      });
  });
}
