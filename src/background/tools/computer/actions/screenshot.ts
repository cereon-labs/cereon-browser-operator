import { toMessage } from "../../../../shared/errors";
import { logger } from "../../../../shared/logger";
import { textAndImage, type ToolResult } from "../../../../shared/messages";
import type { CdpSession } from "../../../cdp/cdp-session";
import type { ComputerAction, ComputerActionContext } from "../action";

const log = logger.child("computer:screenshot");

export class ScreenshotAction implements ComputerAction {
  readonly name = "screenshot";

  async execute(ctx: ComputerActionContext): Promise<ToolResult> {
    const { base64, imageId } = await ctx.screenshots.capture(ctx.session);
    const dims = await viewportDims(ctx.session);
    return textAndImage(
      `Successfully captured screenshot (${dims}, jpeg) - ID: ${imageId}`,
      base64,
      "image/jpeg",
    );
  }
}

/** Best-effort "WxH" viewport string; empty on failure. */
export async function viewportDims(session: CdpSession): Promise<string> {
  try {
    const vp = await session.send<{ result?: { value?: string } }>("Runtime.evaluate", {
      expression: "window.innerWidth + 'x' + window.innerHeight",
    });
    return vp.result?.value ?? "";
  } catch (err) {
    log.debug("viewport probe failed", toMessage(err));
    return "";
  }
}
