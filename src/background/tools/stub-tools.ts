/**
 * Not-yet-implemented tools.
 *
 * Each returns a fixed, honest message. Implemented as one small class
 * parameterized by name + message rather than four near-identical handlers.
 */

import { text, type ToolResult } from "../../shared/messages";
import type { Tool } from "./tool";

class StubTool implements Tool {
  constructor(
    readonly name: string,
    private readonly message: string,
  ) {}

  async execute(): Promise<ToolResult> {
    return text(this.message);
  }
}

export const stubTools: Tool[] = [
  new StubTool("gif_creator", "GIF recording is not yet implemented in this extension."),
  new StubTool(
    "shortcuts_list",
    "No shortcuts available. Shortcuts are not supported in this extension.",
  ),
  new StubTool("shortcuts_execute", "Shortcuts are not supported in this extension."),
  new StubTool(
    "switch_browser",
    "Browser switching is not yet supported. The extension connects to whichever browser has it loaded (Chrome, Brave, or Edge).",
  ),
];
