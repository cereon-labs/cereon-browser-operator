import { text, type ToolResult } from "../../../../shared/messages";
import type { ComputerAction, ComputerActionContext } from "../action";

const TYPED_PREVIEW_CHARS = 50;

export class TypeAction implements ComputerAction {
  readonly name = "type";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    const value = ctx.args.text as string | undefined;
    if (!value) return text("text is required for type action");
    await ctx.keyboard.type(value);
    const preview = value.substring(0, TYPED_PREVIEW_CHARS);
    const ellipsis = value.length > TYPED_PREVIEW_CHARS ? "..." : "";
    return text(`Typed "${preview}${ellipsis}"`);
  }
}

export class KeyAction implements ComputerAction {
  readonly name = "key";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    const value = ctx.args.text as string | undefined;
    if (!value) return text("text is required for key action");
    const repeat = await ctx.keyboard.pressKeys(
      value,
      (ctx.args.repeat as number | undefined) ?? 1,
    );
    return text(`Pressed ${repeat} key${repeat > 1 ? "s" : ""}: ${value}`);
  }
}
