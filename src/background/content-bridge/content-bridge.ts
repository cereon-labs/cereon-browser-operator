/**
 * Typed RPC bridge from the service worker to the content script.
 *
 * Wraps `chrome.tabs.sendMessage` with the "inject content.js and retry" fallback
 * (for pages loaded before the script registered) and maps each message type to
 * its result type, so callers get `string`, `FoundElement[]`, etc. instead of
 * `any`.
 */

import type {
  AccessibilityTreeOptions,
  ContentMessage,
  ContentResponse,
  ContentResultMap,
  FoundElement,
  FormSetResult,
  Point,
} from "../../shared/messages";
import { logger } from "../../shared/logger";

const log = logger.child("content-bridge");

export class ContentBridge {
  /** Send a typed message and return its mapped result (or undefined on failure). */
  async request<M extends ContentMessage>(
    tabId: number,
    message: M,
  ): Promise<ContentResultMap[M["type"]] | undefined> {
    const response = await this.sendWithInjectFallback(tabId, message);
    return (response as ContentResponse<ContentResultMap[M["type"]]> | undefined)?.result;
  }

  accessibilityTree(
    tabId: number,
    options?: AccessibilityTreeOptions,
  ): Promise<string | undefined> {
    return this.request(tabId, { type: "generateAccessibilityTree", options });
  }

  pageText(tabId: number): Promise<string | undefined> {
    return this.request(tabId, { type: "getPageText" });
  }

  find(tabId: number, query: string): Promise<FoundElement[] | undefined> {
    return this.request(tabId, { type: "findElements", query });
  }

  setFormValue(tabId: number, ref: string, value: unknown): Promise<FormSetResult | undefined> {
    return this.request(tabId, { type: "setFormValue", ref, value });
  }

  refCoordinates(tabId: number, ref: string): Promise<Point | null | undefined> {
    return this.request(tabId, { type: "getRefCoordinates", ref });
  }

  scrollToRef(tabId: number, ref: string): Promise<{ success: boolean } | undefined> {
    return this.request(tabId, { type: "scrollToRef", ref });
  }

  private async sendWithInjectFallback(tabId: number, message: ContentMessage): Promise<unknown> {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch {
      log.debug(`content script not present in tab ${tabId}; injecting`);
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      return chrome.tabs.sendMessage(tabId, message);
    }
  }
}
