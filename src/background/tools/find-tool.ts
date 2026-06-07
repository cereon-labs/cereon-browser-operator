/**
 * find: locate elements by a natural-language-ish query, with their refs.
 */

import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool, type ToolContext } from "./tool";

export class FindTool extends TabScopedTool {
  readonly name = "find";

  protected async run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const query = String(args.query ?? "");
    const results = (await ctx.content.find(tabId, query)) ?? [];

    if (results.length === 0) return text(`No elements found matching "${query}"`);

    const lines = results
      .map((r) => `[${r.ref}] ${r.role} "${r.name}" at (${r.coordinates[0]}, ${r.coordinates[1]})`)
      .join("\n");
    return text(`Found ${results.length} element(s) matching "${query}":\n\n${lines}`);
  }
}
