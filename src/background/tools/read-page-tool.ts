/**
 * read_page: the page's accessibility tree, with a viewport-size footer.
 */

import { toMessage } from "../../shared/errors";
import { logger } from "../../shared/logger";
import type { AccessibilityTreeOptions } from "../../shared/messages";
import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool, type ToolContext } from "./tool";

const log = logger.child("read-page");

export class ReadPageTool extends TabScopedTool {
  readonly name = "read_page";

  protected async run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const options: AccessibilityTreeOptions = {
      filter: args.filter as AccessibilityTreeOptions["filter"],
      depth: args.depth as number | undefined,
      max_chars: args.max_chars as number | undefined,
      ref_id: args.ref_id as string | undefined,
    };

    let tree =
      (await ctx.content.accessibilityTree(tabId, options)) ??
      "Error: Could not generate accessibility tree";

    try {
      const vp = await ctx.cdp.session(tabId).send<{
        result?: { value?: string };
      }>("Runtime.evaluate", { expression: "window.innerWidth + 'x' + window.innerHeight" });
      if (vp.result?.value) tree += `\n\nViewport: ${vp.result.value}`;
    } catch (err) {
      log.debug("viewport probe failed", toMessage(err));
    }

    return text(tree);
  }
}
