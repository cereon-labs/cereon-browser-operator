import { sleep } from "../../../../shared/async";
import { LIMITS } from "../../../../shared/constants";
import { text, textAndImage, type ToolResult } from "../../../../shared/messages";
import type { ComputerAction, ComputerActionContext, Coordinate } from "../action";

export class WaitAction implements ComputerAction {
  readonly name = "wait";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    const duration = Math.min(
      (ctx.args.duration as number | undefined) ?? 1,
      LIMITS.maxWaitSeconds,
    );
    await sleep(duration * 1000);
    return text(`Waited for ${duration} second${duration !== 1 ? "s" : ""}`);
  }
}

export class DragAction implements ComputerAction {
  readonly name = "left_click_drag";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    const start = ctx.args.start_coordinate as Coordinate | undefined;
    if (!start || !ctx.coordinate) {
      return text("start_coordinate and coordinate are required for left_click_drag");
    }
    await ctx.mouse.drag(start, ctx.coordinate, ctx.modifiers);
    return text(
      `Dragged from (${start[0]}, ${start[1]}) to (${ctx.coordinate[0]}, ${ctx.coordinate[1]})`,
    );
  }
}

export class ZoomAction implements ComputerAction {
  readonly name = "zoom";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    const region = ctx.args.region as number[] | undefined;
    if (!region || region.length !== 4) {
      return text("region [x0, y0, x1, y1] is required for zoom");
    }
    const { base64 } = await ctx.screenshots.capture(ctx.session);
    return textAndImage(`Zoom region: [${region.join(", ")}]`, base64, "image/png");
  }
}
