/**
 * Routes background → content messages to the DOM services.
 *
 * Each branch resolves a typed {@link ContentMessage} and replies with a
 * `{ result }` envelope. Adds the previously-missing `scrollToRef` handler — the
 * background's `computer scroll_to` action sent this message to a content script
 * that had no case for it, so ref-based scrolling silently did nothing.
 */

import type { ContentMessage, Point } from "../shared/messages";
import { AccessibilityTreeBuilder } from "./accessibility/tree-builder";
import { ElementRegistry } from "./dom/element-registry";
import { FormValueSetter } from "./forms/form-value-setter";
import { ElementFinder } from "./search/element-finder";
import { extractPageText } from "./text/page-text-extractor";

type Respond = (response: { result: unknown }) => void;

export class ContentMessageRouter {
  private readonly registry = new ElementRegistry();
  private readonly tree = new AccessibilityTreeBuilder(this.registry);
  private readonly finder = new ElementFinder(this.registry);
  private readonly forms = new FormValueSetter(this.registry);

  register(): void {
    chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) =>
      this.handle(message, sendResponse),
    );
  }

  private handle(message: ContentMessage, respond: Respond): boolean {
    switch (message.type) {
      case "generateAccessibilityTree":
        respond({ result: this.tree.build(message.options) });
        return true;
      case "getPageText":
        respond({ result: JSON.stringify(extractPageText()) });
        return true;
      case "findElements":
        respond({ result: this.finder.find(message.query) });
        return true;
      case "setFormValue":
        respond({ result: this.forms.set(message.ref, message.value) });
        return true;
      case "getRefCoordinates":
        respond({ result: this.coordinates(message.ref) });
        return true;
      case "scrollToRef":
        respond({ result: this.scrollToRef(message.ref) });
        return true;
      default:
        return false;
    }
  }

  private coordinates(ref: string): Point | null {
    const el = this.registry.resolve(ref);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
    };
  }

  private scrollToRef(ref: string): { success: boolean } {
    const el = this.registry.resolve(ref);
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    return { success: el !== null };
  }
}
