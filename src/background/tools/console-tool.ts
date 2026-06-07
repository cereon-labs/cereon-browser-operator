/**
 * read_console_messages: filtered view of captured console output.
 */

import { LIMITS } from "../../shared/constants";
import type { ConsoleEntry } from "../cdp/observers/console-observer";
import { text, type ToolResult } from "../../shared/messages";
import { TabScopedTool, type ToolContext } from "./tool";

const ERROR_LEVELS = new Set(["error", "exception"]);

export class ConsoleTool extends TabScopedTool {
  readonly name = "read_console_messages";

  protected async run(
    tabId: number,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const limit = (args.limit as number | undefined) ?? LIMITS.defaultReadLimit;
    const session = ctx.cdp.session(tabId);
    await session.ensureDomain("Console");
    await session.ensureDomain("Runtime");

    let messages = ctx.cdp.console.snapshot(tabId);
    if (args.onlyErrors) messages = messages.filter((m) => ERROR_LEVELS.has(m.level));
    if (args.pattern) messages = filterByPattern(messages, String(args.pattern));
    messages = messages.slice(-limit);

    if (args.clear) ctx.cdp.console.clear(tabId);

    if (messages.length === 0) return text("No console messages matching the pattern.");

    const body = messages
      .map((m) => `[${m.level}] ${m.text}${m.url ? ` (${m.url})` : ""}`)
      .join("\n");
    return text(`Console messages (${messages.length}):\n${body}`);
  }
}

function filterByPattern(messages: ConsoleEntry[], pattern: string): ConsoleEntry[] {
  try {
    const re = new RegExp(pattern, "i");
    return messages.filter((m) => re.test(m.text) || re.test(m.level));
  } catch {
    return messages.filter((m) => m.text.includes(pattern));
  }
}
