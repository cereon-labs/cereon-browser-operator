import { sleep } from "../../../../shared/async";
import { LIMITS, TIMING } from "../../../../shared/constants";
import { text, textAndImage, type ToolResult } from "../../../../shared/messages";
import type { ComputerAction, ComputerActionContext } from "../action";

type ScrollDirection = "up" | "down" | "left" | "right";

export class ScrollAction implements ComputerAction {
  readonly name = "scroll";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    if (!ctx.coordinate) return text("coordinate is required for scroll");
    const [x, y] = ctx.coordinate;
    const direction = (ctx.args.scroll_direction as ScrollDirection | undefined) ?? "down";
    const amount = Math.min(
      (ctx.args.scroll_amount as number | undefined) ?? 3,
      LIMITS.maxScrollTicks,
    );

    const { deltaX, deltaY } = deltas(direction, amount);
    await ctx.mouse.wheel(x, y, deltaX, deltaY, ctx.modifiers);
    await sleep(TIMING.scrollSettleMs);

    const { base64 } = await ctx.screenshots.capture(ctx.session);
    return textAndImage(`Scrolled ${direction} by ${amount} ticks at (${x}, ${y})`, base64);
  }
}

export class ScrollToAction implements ComputerAction {
  readonly name = "scroll_to";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    const ref = ctx.args.ref as string | undefined;
    if (!ctx.coordinate && !ref) return text("coordinate or ref is required for scroll_to");

    // Ref-based scroll now reaches a real handler in the content script
    // (the message had no handler before this refactor).
    if (ref) await ctx.content.scrollToRef(ctx.tabId, ref);
    if (ctx.coordinate) {
      const [x, y] = ctx.coordinate;
      await ctx.session.send("Runtime.evaluate", { expression: `window.scrollTo(${x}, ${y})` });
    }

    await sleep(TIMING.scrollSettleMs);
    return text("Scrolled to target");
  }
}

function deltas(direction: ScrollDirection, amount: number): { deltaX: number; deltaY: number } {
  const px = amount * LIMITS.scrollTickPx;
  switch (direction) {
    case "left":
      return { deltaX: -px, deltaY: 0 };
    case "right":
      return { deltaX: px, deltaY: 0 };
    case "up":
      return { deltaX: 0, deltaY: -px };
    case "down":
    default:
      return { deltaX: 0, deltaY: px };
  }
}
