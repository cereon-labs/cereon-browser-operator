/**
 * Navigation: load a URL, or go back/forward, then report the group's pages.
 */

import { TIMING } from "../../shared/constants";
import { ValidationError, toMessage } from "../../shared/errors";
import { text, type ToolResult } from "../../shared/messages";
import { normalizeUrl } from "../../shared/url";
import { TabScopedTool, type ToolContext } from "./tool";

export class NavigateTool extends TabScopedTool {
  readonly name = "navigate";

  protected async run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const url = String(args.url ?? "");

    if (url === "back") {
      await chrome.tabs.goBack(tabId);
    } else if (url === "forward") {
      await chrome.tabs.goForward(tabId);
    } else {
      let target: string;
      try {
        target = normalizeUrl(url);
      } catch (err) {
        if (err instanceof ValidationError) return text(toMessage(err));
        throw err;
      }
      await chrome.tabs.update(tabId, { url: target });
    }

    await waitForLoad(tabId, TIMING.navigationTimeoutMs);

    const tab = await chrome.tabs.get(tabId);
    const tabs = await ctx.tabGroup.listTabs();
    const loading = tab.status !== "complete" ? " (still loading)" : "";
    const pages = tabs
      .map((t, i) => `${i + 1}: ${t.url}${t.id === tabId ? " [selected]" : ""}`)
      .join("\n");

    return text(`Navigated to ${tab.url}${loading}.\n## Pages\n${pages}`);
  }
}

/** Resolve when the tab reaches `complete`, or after `timeoutMs`. */
function waitForLoad(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (updatedTabId: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);
  });
}
