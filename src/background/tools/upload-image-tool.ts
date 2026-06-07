/**
 * upload_image: resolve a previously captured screenshot for a file/drop target.
 *
 * Currently surfaces guidance only (actual upload is not yet wired), but it does
 * validate that the referenced screenshot exists.
 */

import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool, type ToolContext } from "./tool";

export class UploadImageTool extends TabScopedTool {
  readonly name = "upload_image";

  protected async run(
    _tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const imageId = String(args.imageId ?? "");
    if (!ctx.screenshots.get(imageId)) {
      return text(`Image ${imageId} not found. Take a screenshot first.`);
    }
    return text(
      `Image upload for ref=${String(args.ref)}, coordinate=${String(args.coordinate)} — use drag & drop or file input.`,
    );
  }
}
