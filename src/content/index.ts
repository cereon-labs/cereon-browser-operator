/**
 * Content-script entry point.
 *
 * Guards against double-injection (the script is both declared in the manifest
 * and injected on demand by the background's content bridge), then registers the
 * message router that exposes the DOM services to the service worker.
 */

import { ContentMessageRouter } from "./message-router";

declare global {
  interface Window {
    __browserOperatorLoaded?: boolean;
  }
}

if (!window.__browserOperatorLoaded) {
  window.__browserOperatorLoaded = true;
  new ContentMessageRouter().register();
}
