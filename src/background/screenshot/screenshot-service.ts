/**
 * Captures and retains recent screenshots.
 *
 * Captures JPEG at a primary quality, and re-captures at a lower quality if the
 * payload is too large for the transport. Recent captures are retained by id
 * (bounded) so a later `upload_image` can reference them.
 */

import { LIMITS, SCREENSHOT_QUALITY } from "../../shared/constants";
import type { CdpSession } from "../cdp/cdp-session";

export interface Screenshot {
  base64: string;
  imageId: string;
}

interface CaptureResult {
  data: string;
}

export class ScreenshotService {
  private readonly store = new Map<string, string>();

  async capture(session: CdpSession): Promise<Screenshot> {
    let base64 = await this.captureAt(session, SCREENSHOT_QUALITY.primary);
    if (base64.length > LIMITS.screenshotResizeBytes) {
      base64 = await this.captureAt(session, SCREENSHOT_QUALITY.fallback);
    }

    const imageId = `screenshot_${Date.now()}`;
    this.retain(imageId, base64);
    return { base64, imageId };
  }

  get(imageId: string): string | undefined {
    return this.store.get(imageId);
  }

  private async captureAt(session: CdpSession, quality: number): Promise<string> {
    const result = await session.send<CaptureResult>("Page.captureScreenshot", {
      format: "jpeg",
      quality,
      optimizeForSpeed: true,
      captureBeyondViewport: false,
    });
    return result.data;
  }

  private retain(imageId: string, base64: string): void {
    this.store.set(imageId, base64);
    while (this.store.size > LIMITS.screenshots) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }
}
