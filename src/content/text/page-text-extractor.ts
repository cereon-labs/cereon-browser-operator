/**
 * Extracts the readable text of a page's main content region.
 *
 * Picks the most content-bearing container via a selector preference list,
 * clones it, strips non-text nodes, and collapses whitespace. Returns structured
 * data; serialization to the wire happens in the message router.
 */

import { CONTENT_LIMITS } from "../../shared/constants";

const CONTENT_SELECTORS = [
  "article",
  "main",
  '[class*="articleBody"]',
  '[class*="post-content"]',
  '[class*="entry-content"]',
  '[role="main"]',
  ".content",
  "#content",
];

const STRIP_SELECTOR = "script, style, noscript, template, svg";

export interface PageText {
  title: string;
  url: string;
  sourceTag: string;
  text: string;
}

export function extractPageText(): PageText {
  const source = pickSource();
  const clone = source.cloneNode(true) as Element;
  clone.querySelectorAll(STRIP_SELECTOR).forEach((el) => el.remove());
  const text = (clone.textContent ?? "").replace(/\s+/g, " ").trim();

  return {
    title: document.title || "",
    url: location.href,
    sourceTag: source.tagName.toLowerCase(),
    text: text.substring(0, CONTENT_LIMITS.pageTextMax),
  };
}

function pickSource(): Element {
  for (const selector of CONTENT_SELECTORS) {
    const found = document.querySelector(selector);
    if (found) return found;
  }
  return document.body;
}
