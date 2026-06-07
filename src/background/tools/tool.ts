/**
 * The tool abstraction.
 *
 * A `Tool` is a named command with one `execute` method (Command pattern). The
 * `ToolContext` is the dependency bag the {@link ToolRegistry} injects into every
 * tool — each tool reaches only the services it needs, nothing global.
 *
 * `TabScopedTool` factors out the guard shared by every tab-targeting tool:
 * validate `tabId` and confirm the tab is inside the MCP group before running.
 */

import { text, type ToolResult } from "../../shared/messages";
import type { CdpSessionManager } from "../cdp/cdp-manager";
import type { ContentBridge } from "../content-bridge/content-bridge";
import { KeyboardController } from "../input/keyboard-controller";
import { MouseController } from "../input/mouse-controller";
import type { ScreenshotService } from "../screenshot/screenshot-service";
import type { TabGroupManager } from "../tabs/tab-group-manager";

export interface ToolContext {
  readonly cdp: CdpSessionManager;
  readonly tabGroup: TabGroupManager;
  readonly content: ContentBridge;
  readonly screenshots: ScreenshotService;
  mouseFor(tabId: number): MouseController;
  keyboardFor(tabId: number): KeyboardController;
}

export interface Tool {
  readonly name: string;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

/** Builds a ToolContext from the wired services (called by the composition root). */
export function createToolContext(deps: {
  cdp: CdpSessionManager;
  tabGroup: TabGroupManager;
  content: ContentBridge;
  screenshots: ScreenshotService;
}): ToolContext {
  return {
    ...deps,
    mouseFor: (tabId) => new MouseController(deps.cdp.session(tabId)),
    keyboardFor: (tabId) => new KeyboardController(deps.cdp.session(tabId)),
  };
}

/** Base class for tools that operate on a specific tab in the MCP group. */
export abstract class TabScopedTool implements Tool {
  abstract readonly name: string;

  async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const tabId = Number(args.tabId);
    if (!Number.isInteger(tabId)) return text("tabId is required and must be a number.");
    if (!(await ctx.tabGroup.isInGroup(tabId))) {
      return text(`Tab ${tabId} is not in the MCP group.`);
    }
    return this.run(tabId, args, ctx);
  }

  protected abstract run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult>;
}
