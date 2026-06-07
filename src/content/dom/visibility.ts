/**
 * Visibility and interactivity predicates.
 *
 * Pure DOM queries with no mutation. `isVisible` mirrors the original's
 * offsetParent + computed-style heuristic; `isInteractive` recognizes natively
 * interactive tags, interactive ARIA roles, tabindex, click handlers, and
 * contentEditable.
 */

const INTERACTIVE_TAGS = new Set([
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "details",
]);

const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "tab",
  "menuitem",
  "switch",
  "combobox",
  "slider",
  "spinbutton",
  "searchbox",
  "option",
]);

export function isVisible(el: Element): boolean {
  const html = el as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const style = getComputedStyle(el);
  if (html.offsetParent === null && tag !== "body" && style.position !== "fixed") return false;
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

export function isInteractive(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (INTERACTIVE_TAGS.has(tag)) return true;

  const role = el.getAttribute("role");
  if (role && INTERACTIVE_ROLES.has(role)) return true;

  const html = el as HTMLElement;
  if (html.tabIndex >= 0) return true;
  if (html.onclick || el.getAttribute("onclick")) return true;
  if (html.isContentEditable || el.getAttribute("contenteditable") === "true") return true;
  return false;
}
