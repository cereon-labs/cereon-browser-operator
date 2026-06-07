/**
 * get_page_text: the readable text of the page's main content region.
 */

import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool, type ToolContext } from "./tool";

interface PageTextPayload {
  title: string;
  url: string;
  sourceTag: string;
  text: string;
}

export class PageTextTool extends TabScopedTool {
  readonly name = "get_page_text";

  protected async run(
    tabId: number,
    _args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const raw = await ctx.content.pageText(tabId);
    if (!raw) return text("Error: Could not extract page text");

    try {
      const data = JSON.parse(raw) as PageTextPayload;
      return text(
        `Title: ${data.title}\nURL: ${data.url}\nSource: <${data.sourceTag}>\n\n${data.text}`,
      );
    } catch {
      return text(raw);
    }
  }
}
