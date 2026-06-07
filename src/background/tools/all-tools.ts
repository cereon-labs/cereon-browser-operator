/**
 * The complete set of tools this extension exposes (18 total).
 *
 * One place to see every registered tool; `index.ts` feeds these into the
 * registry. Order is irrelevant — dispatch is by name.
 */

import { ComputerTool } from "./computer/computer-tool";
import { ConsoleTool } from "./console-tool";
import { FindTool } from "./find-tool";
import { FormInputTool } from "./form-input-tool";
import { JavascriptTool } from "./javascript-tool";
import { NavigateTool } from "./navigate-tool";
import { NetworkTool } from "./network-tool";
import { PageTextTool } from "./page-text-tool";
import { UpdatePlanTool } from "./plan-tool";
import { ReadPageTool } from "./read-page-tool";
import { ResizeWindowTool } from "./resize-tool";
import { stubTools } from "./stub-tools";
import { TabsContextTool, TabsCreateTool } from "./tabs-tools";
import type { Tool } from "./tool";
import { UploadImageTool } from "./upload-image-tool";

export function createTools(): Tool[] {
  return [
    new TabsContextTool(),
    new TabsCreateTool(),
    new NavigateTool(),
    new ComputerTool(),
    new ReadPageTool(),
    new PageTextTool(),
    new FindTool(),
    new FormInputTool(),
    new JavascriptTool(),
    new ConsoleTool(),
    new NetworkTool(),
    new ResizeWindowTool(),
    new UploadImageTool(),
    new UpdatePlanTool(),
    ...stubTools,
  ];
}
