/**
 * Builds a compact, indented accessibility tree of the page.
 *
 * Walks the DOM (including shadow roots), assigning stable refs to shown nodes
 * and emitting one line per node under a character budget. Filtering is "all"
 * (anything with a role or name) or "interactive" (interactive nodes only).
 */

import { CONTENT_LIMITS } from "../../shared/constants";
import type { AccessibilityTreeOptions } from "../../shared/messages";
import { getAccessibleName } from "../dom/accessible-name";
import type { ElementRegistry } from "../dom/element-registry";
import { getRole } from "../dom/role-resolver";
import { isInteractive, isVisible } from "../dom/visibility";
import { OutputBudget } from "./output-budget";

const SKIP_TAGS = new Set(["script", "style", "noscript", "template"]);
const INDENT = "  ";

type Filter = "all" | "interactive";

export class AccessibilityTreeBuilder {
  constructor(private readonly registry: ElementRegistry) {}

  build(options: AccessibilityTreeOptions = {}): string {
    const filter: Filter = options.filter ?? "all";
    const maxDepth = options.depth ?? CONTENT_LIMITS.treeMaxDepth;
    const budget = new OutputBudget(options.max_chars ?? CONTENT_LIMITS.treeMaxChars);

    let root: Element = document.body;
    if (options.ref_id) {
      const el = this.registry.resolve(options.ref_id);
      if (!el) {
        return `Error: ref_id "${options.ref_id}" not found or element was garbage collected.`;
      }
      root = el;
    }

    this.walk(root, 0, "", filter, maxDepth, budget);
    return budget.toString();
  }

  private walk(
    el: Element,
    depth: number,
    indent: string,
    filter: Filter,
    maxDepth: number,
    budget: OutputBudget,
  ): void {
    if (budget.truncated || depth > maxDepth || el.nodeType !== 1) return;

    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;

    const role = getRole(el);
    const name = getAccessibleName(el);
    const interactive = isInteractive(el);
    const isContainer = el.children.length > 0;

    if (filter === "interactive" && !interactive && !isContainer) return;

    const shouldShow =
      (filter === "all" && (role || name)) || (filter === "interactive" && interactive);
    const visible = isVisible(el);

    if (shouldShow && visible) {
      if (!budget.append(`${this.renderLine(el, indent, role, name)}\n`)) return;
    }

    const nextIndent = shouldShow && visible ? indent + INDENT : indent;
    if (el.shadowRoot) {
      for (const child of el.shadowRoot.children) {
        this.walk(child, depth + 1, nextIndent, filter, maxDepth, budget);
      }
    }
    for (const child of el.children) {
      this.walk(child, depth + 1, nextIndent, filter, maxDepth, budget);
    }
  }

  private renderLine(el: Element, indent: string, role: string | null, name: string): string {
    const tag = el.tagName.toLowerCase();
    const ref = this.registry.getOrAssign(el);
    const cap = (v: string) => v.substring(0, CONTENT_LIMITS.attrValueMax);

    let line = indent;
    if (role) line += role;
    if (name) line += ` "${name.substring(0, CONTENT_LIMITS.treeLineNameMax)}"`;
    line += ` [${ref}]`;

    const anchor = el as HTMLAnchorElement;
    const img = el as HTMLImageElement;
    const input = el as HTMLInputElement;

    if (tag === "a" && anchor.href) line += ` href="${anchor.href}"`;
    if (tag === "img" && img.src) line += ` src="${cap(img.src)}"`;
    if ((tag === "input" || tag === "textarea") && input.value)
      line += ` value="${cap(input.value)}"`;
    if (tag === "input") line += ` type="${input.type || "text"}"`;

    for (const attr of ["aria-expanded", "aria-checked", "aria-selected"] as const) {
      const value = el.getAttribute(attr);
      if (value) line += ` ${attr.replace("aria-", "")}=${value}`;
    }
    if ((el as HTMLInputElement).disabled) line += " disabled";

    if (tag === "select") {
      const opts = Array.from((el as HTMLSelectElement).options).map(
        (o) => `${o.selected ? "*" : " "}${o.value}="${o.textContent?.trim() ?? ""}"`,
      );
      if (opts.length) line += ` options=[${opts.join(", ")}]`;
    }

    return line;
  }
}
