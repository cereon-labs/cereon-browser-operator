/**
 * resize_window: resize the window that owns the target tab.
 */

import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool } from "./tool";

export class ResizeWindowTool extends TabScopedTool {
  readonly name = "resize_window";

  protected async run(tabId: number, args: Record<string, unknown>): Promise<ToolResult> {
    const width = Number(args.width);
    const height = Number(args.height);
    const tab = await chrome.tabs.get(tabId);
    await chrome.windows.update(tab.windowId, { width, height });
    return text(`Resized window to ${width}x${height}`);
  }
}
