/**
 * Mouse input via CDP `Input.dispatchMouseEvent`.
 *
 * Wraps the move→press→release choreography (and a stepped drag) behind intent-
 * revealing methods so the tools read as `mouse.click(x, y)` rather than raw
 * event dispatch.
 */

import { sleep } from "../../shared/async";
import { TIMING } from "../../shared/constants";
import type { CdpSession } from "../cdp/cdp-session";

export interface MouseOptions {
  button?: "left" | "right" | "middle";
  clickCount?: number;
  modifiers?: number;
}

type MouseEventType = "mouseMoved" | "mousePressed" | "mouseReleased" | "mouseWheel";

export class MouseController {
  constructor(private readonly session: CdpSession) {}

  async dispatch(
    type: MouseEventType,
    x: number,
    y: number,
    opts: MouseOptions = {},
  ): Promise<void> {
    await this.session.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: opts.button ?? "left",
      clickCount: opts.clickCount ?? 1,
      modifiers: opts.modifiers ?? 0,
    });
  }

  async click(x: number, y: number, opts: MouseOptions = {}): Promise<void> {
    const { button = "left", clickCount = 1, modifiers = 0 } = opts;
    await this.dispatch("mouseMoved", x, y, { modifiers });
    await sleep(TIMING.clickStepMs);
    await this.dispatch("mousePressed", x, y, { button, clickCount, modifiers });
    await sleep(TIMING.clickStepMs);
    await this.dispatch("mouseReleased", x, y, { button, clickCount, modifiers });
  }

  async hover(x: number, y: number, modifiers = 0): Promise<void> {
    await this.dispatch("mouseMoved", x, y, { modifiers });
    await sleep(TIMING.hoverSettleMs);
  }

  async wheel(x: number, y: number, deltaX: number, deltaY: number, modifiers = 0): Promise<void> {
    await this.session.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x,
      y,
      deltaX,
      deltaY,
      modifiers,
    });
  }

  async drag(
    from: readonly [number, number],
    to: readonly [number, number],
    modifiers = 0,
  ): Promise<void> {
    const [sx, sy] = from;
    const [ex, ey] = to;
    await this.dispatch("mouseMoved", sx, sy, { modifiers });
    await sleep(TIMING.clickStepMs);
    await this.dispatch("mousePressed", sx, sy, { button: "left", modifiers });
    await sleep(TIMING.clickStepMs);
    for (let i = 1; i <= TIMING.dragSteps; i++) {
      const mx = sx + ((ex - sx) * i) / TIMING.dragSteps;
      const my = sy + ((ey - sy) * i) / TIMING.dragSteps;
      await this.dispatch("mouseMoved", mx, my, { modifiers });
      await sleep(TIMING.dragStepMs);
    }
    await this.dispatch("mouseReleased", ex, ey, { button: "left", modifiers });
  }
}
