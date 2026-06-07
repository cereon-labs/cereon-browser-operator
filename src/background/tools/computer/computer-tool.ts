/**
 * computer: the multi-action input tool.
 *
 * Resolves the shared inputs once — a target coordinate (from `ref` or
 * `coordinate`) and a modifier mask — then dispatches to the matching
 * {@link ComputerAction} strategy. Adding an action is a registry entry, not a
 * new switch case.
 */

import { text, type ToolResult } from "../../../shared/messages";
import { KeyParser } from "../../input/key-parser";
import { TabScopedTool, type ToolContext } from "../tool";
import type { ComputerAction, ComputerActionContext, Coordinate } from "./action";
import { clickActions } from "./actions/click";
import { DragAction, WaitAction, ZoomAction } from "./actions/misc";
import { ScreenshotAction } from "./actions/screenshot";
import { ScrollAction, ScrollToAction } from "./actions/scroll";
import { KeyAction, TypeAction } from "./actions/text-input";

function buildActionRegistry(): Map<string, ComputerAction> {
  const actions: ComputerAction[] = [
    new ScreenshotAction(),
    ...clickActions,
    new TypeAction(),
    new KeyAction(),
    new ScrollAction(),
    new ScrollToAction(),
    new WaitAction(),
    new DragAction(),
    new ZoomAction(),
  ];
  return new Map(actions.map((a) => [a.name, a]));
}

export class ComputerTool extends TabScopedTool {
  readonly name = "computer";
  private readonly actions = buildActionRegistry();
  private readonly keyParser = new KeyParser();

  protected async run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const action = this.actions.get(String(args.action));
    if (!action) return text(`Unknown computer action: ${String(args.action)}`);

    const coordinate = await this.resolveCoordinate(tabId, args, ctx);
    if (coordinate === "unresolved") {
      return text(`Could not resolve ref "${String(args.ref)}" to coordinates.`);
    }

    const session = ctx.cdp.session(tabId);
    const actionCtx: ComputerActionContext = {
      tabId,
      args,
      coordinate,
      modifiers: this.keyParser.parseModifiers(args.modifiers as string | undefined),
      session,
      mouse: ctx.mouseFor(tabId),
      keyboard: ctx.keyboardFor(tabId),
      screenshots: ctx.screenshots,
      content: ctx.content,
    };
    return action.execute(actionCtx);
  }

  /**
   * Returns an explicit coordinate, `undefined` when none was requested, or the
   * sentinel `"unresolved"` when a `ref` could not be located.
   */
  private async resolveCoordinate(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<Coordinate | undefined | "unresolved"> {
    const explicit = args.coordinate as Coordinate | undefined;
    if (explicit) return explicit;

    const ref = args.ref as string | undefined;
    if (!ref) return undefined;

    const point = await ctx.content.refCoordinates(tabId, ref);
    if (!point) return "unresolved";
    return [point.x, point.y];
  }
}
