/**
 * form_input: set the value of an input/select/checkbox by element ref.
 */

import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool, type ToolContext } from "./tool";

export class FormInputTool extends TabScopedTool {
  readonly name = "form_input";

  protected async run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const ref = String(args.ref ?? "");
    const value = args.value;

    const result = await ctx.content.setFormValue(tabId, ref, value);
    if (result?.error) return text(`Error: ${result.error}`);
    return text(`Set ${ref} to "${String(value)}". Result: ${JSON.stringify(result)}`);
  }
}
