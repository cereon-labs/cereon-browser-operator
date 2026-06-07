/**
 * The `computer` tool's sub-action abstraction.
 *
 * The original `computer` handler was an 11-case switch. Each case becomes a
 * `ComputerAction` strategy with a uniform `execute(ctx)` signature, so adding an
 * action means writing a class and registering it — not extending a switch.
 *
 * `ComputerActionContext` carries everything the actions share: the already
 * resolved coordinate (from `ref` or `coordinate`) and modifier mask, plus the
 * per-tab input/screenshot/content services.
 */

import type { ToolResult } from "../../../shared/messages";
import type { CdpSession } from "../../cdp/cdp-session";
import type { ContentBridge } from "../../content-bridge/content-bridge";
import type { KeyboardController } from "../../input/keyboard-controller";
import type { MouseController } from "../../input/mouse-controller";
import type { ScreenshotService } from "../../screenshot/screenshot-service";

export type Coordinate = [number, number];

export interface ComputerActionContext {
  readonly tabId: number;
  readonly args: Record<string, unknown>;
  readonly coordinate?: Coordinate;
  readonly modifiers: number;
  readonly session: CdpSession;
  readonly mouse: MouseController;
  readonly keyboard: KeyboardController;
  readonly screenshots: ScreenshotService;
  readonly content: ContentBridge;
}

export interface ComputerAction {
  readonly name: string;
  execute(ctx: ComputerActionContext): Promise<ToolResult>;
}
