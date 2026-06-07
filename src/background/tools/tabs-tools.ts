/**
 * Tab-group context tools (not tab-scoped — they manage the group itself).
 */

import { text, type ToolResult } from "../../shared/messages";
import type { Tool, ToolContext } from "./tool";

/** Shared formatter: a JSON header line plus a human-readable tab list. */
function formatTabContext(tabs: chrome.tabs.Tab[], groupId: number | null): ToolResult {
  const available = tabs.map((t) => ({
    tabId: t.id,
    title: t.title || "Untitled",
    url: t.url || "",
  }));

  const lines = available.map((t) => `  • tabId ${t.tabId}: "${t.title}" (${t.url})`).join("\n");
  const body = `Tab Context:\n- Available tabs:\n${lines}\n`;

  return text(`${JSON.stringify({ availableTabs: available, tabGroupId: groupId })}\n\n${body}`);
}

export class TabsContextTool implements Tool {
  readonly name = "tabs_context_mcp";

  async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    await ctx.tabGroup.ensure(Boolean(args.createIfEmpty));
    if (ctx.tabGroup.id === null) {
      return text("No MCP tab group exists. Use createIfEmpty: true to create one.");
    }
    const tabs = await ctx.tabGroup.listTabs();
    return formatTabContext(tabs, ctx.tabGroup.id);
  }
}

export class TabsCreateTool implements Tool {
  readonly name = "tabs_create_mcp";

  async execute(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const tab = await ctx.tabGroup.addTab();
    const tabs = await ctx.tabGroup.listTabs();
    const ctxResult = formatTabContext(tabs, ctx.tabGroup.id);
    const header = `Created new tab. Tab ID: ${tab.id}\n\n`;
    const first = ctxResult.content[0];
    if (first?.type === "text") first.text = header + first.text;
    return ctxResult;
  }
}
