/**
 * read_network_requests: filtered view of captured network activity.
 */

import { LIMITS } from "../../shared/constants";
import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool, type ToolContext } from "./tool";

export class NetworkTool extends TabScopedTool {
  readonly name = "read_network_requests";

  protected async run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const limit = (args.limit as number | undefined) ?? LIMITS.defaultReadLimit;
    await ctx.cdp.session(tabId).ensureDomain("Network");

    let requests = ctx.cdp.network.snapshot(tabId);
    if (args.urlPattern) {
      const pattern = String(args.urlPattern);
      requests = requests.filter((r) => r.url.includes(pattern));
    }
    requests = requests.slice(-limit);

    if (args.clear) ctx.cdp.network.clear(tabId);

    if (requests.length === 0) return text("No network requests matching the pattern.");

    const body = requests
      .map(
        (r) =>
          `${r.method} ${r.url} ${r.status ? `→ ${r.status}` : "(pending)"}${r.mimeType ? ` [${r.mimeType}]` : ""}`,
      )
      .join("\n");
    return text(`Network requests (${requests.length}):\n${body}`);
  }
}
