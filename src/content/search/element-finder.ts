/**
 * Substring search over visible elements (including shadow DOM).
 *
 * Concatenates each element's role/name/text/attributes and matches the query
 * case-insensitively, returning up to a capped number of hits with their refs
 * and click coordinates.
 */

import { CONTENT_LIMITS } from "../../shared/constants";
import type { FoundElement } from "../../shared/messages";
import { getAccessibleName } from "../dom/accessible-name";
import type { ElementRegistry } from "../dom/element-registry";
import { getRole } from "../dom/role-resolver";
import { isVisible } from "../dom/visibility";

const SKIP_TAGS = new Set(["script", "style", "noscript", "template"]);

export class ElementFinder {
  constructor(private readonly registry: ElementRegistry) {}

  find(query: string): FoundElement[] {
    const needle = query.toLowerCase();
    const results: FoundElement[] = [];

    for (const el of collectAll(document)) {
      if (results.length >= CONTENT_LIMITS.findMaxResults) break;
      if (!isVisible(el)) continue;

      const tag = el.tagName.toLowerCase();
      if (SKIP_TAGS.has(tag)) continue;

      const role = getRole(el) ?? "";
      const name = getAccessibleName(el) ?? "";
      const text = el.textContent?.trim()?.substring(0, CONTENT_LIMITS.findTextSnippet) ?? "";
      const input = el as HTMLInputElement;
      const haystack =
        `${role} ${name} ${text} ${input.placeholder ?? ""} ${el.getAttribute("aria-label") ?? ""} ` +
        `${(el as HTMLElement).title ?? ""} ${input.type ?? ""} ${tag}`;

      if (!haystack.toLowerCase().includes(needle)) continue;

      const rect = el.getBoundingClientRect();
      results.push({
        ref: this.registry.getOrAssign(el),
        role: role || tag,
        name: name || text.substring(0, CONTENT_LIMITS.findNameSnippet),
        coordinates: [Math.round(rect.x + rect.width / 2), Math.round(rect.y + rect.height / 2)],
      });
    }

    return results;
  }
}

/** All elements under a root, descending into shadow roots. */
function collectAll(root: Document | ShadowRoot): Element[] {
  const elements: Element[] = [];
  for (const el of root.querySelectorAll("*")) {
    elements.push(el);
    if (el.shadowRoot) elements.push(...collectAll(el.shadowRoot));
  }
  return elements;
}
