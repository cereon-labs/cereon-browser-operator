import { text, type ToolResult } from "../../../../shared/messages";
import type { MouseOptions } from "../../../input/mouse-controller";
import type { ComputerAction, ComputerActionContext } from "../action";

/**
 * One click strategy covering left/right/double/triple clicks — the four cases
 * differed only by button + clickCount + a verb, so they share one class.
 */
export class ClickAction implements ComputerAction {
  constructor(
    readonly name: string,
    private readonly verb: string,
    private readonly options: MouseOptions,
  ) {}

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    if (!ctx.coordinate) return text(`coordinate is required for ${this.name}`);
    const [x, y] = ctx.coordinate;
    await ctx.mouse.click(x, y, { ...this.options, modifiers: ctx.modifiers });
    return text(`${this.verb} at (${x}, ${y})`);
  }
}

export class HoverAction implements ComputerAction {
  readonly name = "hover";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    if (!ctx.coordinate) return text("coordinate is required for hover");
    const [x, y] = ctx.coordinate;
    await ctx.mouse.hover(x, y, ctx.modifiers);
    return text(`Hovered at (${x}, ${y})`);
  }
}

export const clickActions: ComputerAction[] = [
  new ClickAction("left_click", "Clicked", {}),
  new ClickAction("right_click", "Right-clicked", { button: "right" }),
  new ClickAction("double_click", "Double-clicked", { clickCount: 2 }),
  new ClickAction("triple_click", "Triple-clicked", { clickCount: 3 }),
  new HoverAction(),
];
