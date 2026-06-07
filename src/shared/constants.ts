/**
 * Cross-context, vendor-neutral tunables.
 *
 * Everything that used to be a scattered magic string or number lives here so a
 * reviewer can read the extension's knobs in one place. Backend-specific values
 * (server URL, endpoint paths, auth token) are NOT here — they are runtime
 * configuration (see `src/config/`). Branding lives in `src/shared/brand.ts`.
 */

/** The Chrome DevTools Protocol version this extension speaks. */
export const CDP_VERSION = "1.3";

/** Reconnect backoff (milliseconds) shared by every transport. */
export const BACKOFF = {
  initialMs: 1_000,
  maxMs: 30_000,
  factor: 2,
} as const;

/** How often the watchdog alarm checks that the SSE loop is still alive. */
export const SSE_WATCHDOG_PERIOD_MINUTES = 1;

/** Bounded-buffer caps for captured telemetry. */
export const LIMITS = {
  consoleMessages: 1_000,
  networkRequests: 1_000,
  screenshots: 10,
  /** Default `read_console` / `read_network` page size. */
  defaultReadLimit: 100,
  /** Max key-press repeats accepted by the `key` action. */
  maxKeyRepeat: 100,
  /** Max scroll ticks per `scroll` action. */
  maxScrollTicks: 10,
  /** Pixels per scroll tick. */
  scrollTickPx: 100,
  /** Max `wait` duration in seconds. */
  maxWaitSeconds: 30,
  /** Screenshot byte threshold above which we re-capture at lower quality. */
  screenshotResizeBytes: 500_000,
} as const;

/** Timeouts and inter-event delays (milliseconds). */
export const TIMING = {
  navigationTimeoutMs: 10_000,
  clickStepMs: 50,
  hoverSettleMs: 200,
  scrollSettleMs: 300,
  typeCharMs: 10,
  keyPressMs: 30,
  dragStepMs: 20,
  dragSteps: 10,
} as const;

/** JPEG capture quality tiers used by the screenshot service. */
export const SCREENSHOT_QUALITY = {
  primary: 55,
  fallback: 30,
} as const;

/** Content-script (DOM introspection) tunables. */
export const CONTENT_LIMITS = {
  /** Max characters of an element's derived accessible name. */
  accessibleNameMax: 200,
  /** Max characters of a name as rendered into an accessibility-tree line. */
  treeLineNameMax: 100,
  /** Default tree recursion depth. */
  treeMaxDepth: 15,
  /** Default tree character budget before truncation. */
  treeMaxChars: 50_000,
  /** Max characters of an attribute value rendered into a tree line. */
  attrValueMax: 100,
  /** Max element matches returned by `find`. */
  findMaxResults: 20,
  /** Max characters of textContent considered when matching in `find`. */
  findTextSnippet: 200,
  /** Max characters of a fallback name in `find` results. */
  findNameSnippet: 80,
  /** Max characters of extracted page text. */
  pageTextMax: 100_000,
} as const;
