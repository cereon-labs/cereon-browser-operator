/**
 * Derives an element's accessible name.
 *
 * Follows the priority chain aria-label → aria-labelledby → placeholder → title
 * → alt → associated/ancestor <label> → direct text (for leaf-ish tags only).
 * Pure and side-effect free.
 */

import { CONTENT_LIMITS } from "../../shared/constants";

const TEXT_NAME_TAGS = new Set([
  "a",
  "button",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "summary",
  "label",
  "th",
  "td",
  "span",
]);

export function getAccessibleName(el: Element): string {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.trim();

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const names = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (names.length) return names.join(" ");
  }

  const anyEl = el as HTMLInputElement & HTMLImageElement;
  if (anyEl.placeholder) return anyEl.placeholder.trim();
  if (anyEl.title) return anyEl.title.trim();
  if (anyEl.alt) return anyEl.alt.trim();

  const fromLabel = labelText(el);
  if (fromLabel) return fromLabel;

  const tag = el.tagName.toLowerCase();
  if (TEXT_NAME_TAGS.has(tag)) {
    const text = el.textContent?.trim();
    if (text && text.length < CONTENT_LIMITS.accessibleNameMax) return text;
  }

  return "";
}

function labelText(el: Element): string {
  if (el.id) {
    const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (explicit) return explicit.textContent?.trim() ?? "";
  }
  const ancestor = el.closest("label");
  if (ancestor) {
    const text = ancestor.textContent?.trim();
    if (text) return text;
  }
  return "";
}
