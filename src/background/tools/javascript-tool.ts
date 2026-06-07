/**
 * javascript_tool: evaluate an expression in the page and return its result.
 */

import { toMessage } from "../../shared/errors";
import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool, type ToolContext } from "./tool";

interface EvaluateResult {
  result: { type: string; value?: unknown; description?: string };
  exceptionDetails?: { text?: string };
}

export class JavascriptTool extends TabScopedTool {
  readonly name = "javascript_tool";

  protected async run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const expression = String(args.text ?? "");
    try {
      const evaluated = await ctx.cdp.session(tabId).send<EvaluateResult>("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });

      if (evaluated.exceptionDetails) {
        return text(
          `Error: ${evaluated.exceptionDetails.text ?? JSON.stringify(evaluated.exceptionDetails)}`,
        );
      }

      const val = evaluated.result;
      if (val.type === "undefined") return text("undefined");
      return text(
        val.value !== undefined ? JSON.stringify(val.value) : (val.description ?? String(val)),
      );
    } catch (err) {
      return text(`Error: ${toMessage(err)}`);
    }
  }
}
