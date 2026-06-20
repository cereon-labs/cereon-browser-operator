/**
 * Vendor-neutral pairing handoff.
 *
 * Lets a web page hand a connection config to the extension instead of the user
 * typing it into the Options page. Any backend — a local MCP server's `/pair`
 * page, a hosted product's web app — can offer a config; the extension always
 * requires an explicit in-popup confirm before applying it, so this adds
 * convenience without trusting the page. Nothing here is coupled to any specific
 * backend (no hardcoded origin, token, or URL).
 *
 * Wire shape (posted by a page via `window.postMessage`, picked up by the
 * content script and relayed to the service worker):
 *
 *   window.postMessage(
 *     {
 *       __browserOperator: "pair-offer",
 *       config: { transport, serverUrl, token, commandPath?, resultPath?, target? },
 *       brand?: { name?: string },
 *     },
 *     window.origin,
 *   );
 */

import {
  DEFAULT_CONFIG,
  type ConnectionConfig,
  type TransportKind,
} from "../config/connection-config";

/** Marker key on the window message that identifies a Browser Operator message. */
export const PAIR_MESSAGE_KEY = "__browserOperator";
/** Discriminator value for a pairing offer (page → extension). */
export const PAIR_OFFER_KIND = "pair-offer";
/** Discriminator for a presence probe (page → extension). */
export const PAIR_PING_KIND = "ping";
/** Discriminator for a presence reply (extension → page). */
export const PAIR_PONG_KIND = "pong";

/** Defensive upper bound on any single offered string (URLs, tokens, paths). */
const MAX_FIELD_LEN = 4096;

/** The connection fields a page may offer. */
export interface PairOfferConfig {
  transport: TransportKind;
  serverUrl: string;
  token: string;
  commandPath?: string;
  resultPath?: string;
  target?: string;
}

/** A validated offer, with the posting origin stamped by the content script. */
export interface PairOffer {
  /** The page origin that made the offer — set by the content script from the
   *  trusted `MessageEvent.origin`, never read from the page-supplied body. */
  origin: string;
  config: PairOfferConfig;
  brand?: { name?: string };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= MAX_FIELD_LEN;
}

/**
 * Parse and shape-validate a raw `window.postMessage` payload into a pairing
 * offer's config. Pure — no chrome.* or DOM access, so it is unit-testable.
 * Returns null for anything that is not a well-formed offer.
 */
export function parsePairOffer(
  data: unknown,
): { config: PairOfferConfig; brand?: { name?: string } } | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg[PAIR_MESSAGE_KEY] !== PAIR_OFFER_KIND) return null;

  const raw = msg.config;
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;

  if (c.transport !== "websocket" && c.transport !== "sse-http") return null;
  if (!isNonEmptyString(c.serverUrl)) return null;
  if (!isNonEmptyString(c.token)) return null;

  const config: PairOfferConfig = {
    transport: c.transport,
    serverUrl: c.serverUrl,
    token: c.token,
  };
  if (isNonEmptyString(c.commandPath)) config.commandPath = c.commandPath;
  if (isNonEmptyString(c.resultPath)) config.resultPath = c.resultPath;
  if (isNonEmptyString(c.target)) config.target = c.target;

  let brand: { name?: string } | undefined;
  if (msg.brand && typeof msg.brand === "object") {
    const name = (msg.brand as Record<string, unknown>).name;
    if (isNonEmptyString(name)) brand = { name };
  }

  return brand ? { config, brand } : { config };
}

/** Merge an offered config over the defaults into a full ConnectionConfig. */
export function offerToConfig(offer: PairOfferConfig): ConnectionConfig {
  return { ...DEFAULT_CONFIG, ...offer };
}

// ─── Presence probe (ping / pong) ────────────────────────────────────────────

/** A presence reply the extension posts back to a page that pinged it. */
export interface PairPong {
  /** Echo of the ping's nonce, so the page can correlate the reply. */
  nonce: string | null;
  /** Extension version, for diagnostics. */
  version: string;
  /** Branded product name (vendor-neutral — comes from the build's brand). */
  productName: string;
}

/** Parse a page → extension presence probe. Returns the (optional) nonce. */
export function parsePing(data: unknown): { nonce: string | null } | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg[PAIR_MESSAGE_KEY] !== PAIR_PING_KIND) return null;
  return { nonce: isNonEmptyString(msg.nonce) ? msg.nonce : null };
}

/** Parse an extension → page presence reply. Pure, for the backend page side. */
export function parsePong(data: unknown): PairPong | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg[PAIR_MESSAGE_KEY] !== PAIR_PONG_KIND) return null;
  if (!isNonEmptyString(msg.version) || !isNonEmptyString(msg.productName)) return null;
  return {
    nonce: isNonEmptyString(msg.nonce) ? msg.nonce : null,
    version: msg.version,
    productName: msg.productName,
  };
}
