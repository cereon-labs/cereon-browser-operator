/**
 * update_plan: echo an automation plan back (auto-approved — this extension has
 * no permission gating).
 */

import { text, type ToolResult } from "../../shared/messages";
import type { Tool } from "./tool";

export class UpdatePlanTool implements Tool {
  readonly name = "update_plan";

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const domains = (args.domains as string[] | undefined) ?? [];
    const approach = (args.approach as string[] | undefined) ?? [];

    const steps = approach.map((step) => `- ${step}`).join("\n");
    return text(
      `Plan:\n\nDomains: ${domains.join(", ")}\n\nApproach:\n${steps}\n\n` +
        "Plan auto-approved (no permission restrictions in this extension).",
    );
  }
}
