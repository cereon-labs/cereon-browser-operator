/**
 * Tool registry + dispatcher.
 *
 * `ToolRegistry` is a name→tool lookup; new tools are added by `register(...)`,
 * never by editing a switch (Open/Closed). `CommandDispatcher` runs an incoming
 * command against the registry and routes the outcome to the result reporter,
 * preserving the original "Unknown tool" vs "<tool> failed" error wording.
 */

import { toMessage } from "../../shared/errors";
import { logger } from "../../shared/logger";
import type { CommandMessage, CommandResult } from "../../shared/messages";
import type { Tool, ToolContext } from "./tool";

/** Anything that can deliver a command result back to the backend. */
export interface ResultSink {
  sendResult(result: CommandResult): Promise<void>;
}

const log = logger.child("tools");

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(...tools: Tool[]): this {
    for (const tool of tools) {
      if (this.tools.has(tool.name)) {
        throw new Error(`Duplicate tool registration: ${tool.name}`);
      }
      this.tools.set(tool.name, tool);
    }
    return this;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  get names(): string[] {
    return [...this.tools.keys()];
  }
}

export class CommandDispatcher {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly context: ToolContext,
    private readonly sink: ResultSink,
  ) {}

  /** Execute a command and report its result; never throws. */
  async handle(command: CommandMessage): Promise<void> {
    const tool = this.registry.get(command.tool);
    if (!tool) {
      await this.sink.sendResult({ commandId: command.id, error: `Unknown tool: ${command.tool}` });
      return;
    }
    try {
      const result = await tool.execute(command.args, this.context);
      await this.sink.sendResult({ commandId: command.id, result });
    } catch (err) {
      log.error(`${command.tool} failed`, toMessage(err));
      await this.sink.sendResult({
        commandId: command.id,
        error: `${command.tool} failed: ${toMessage(err)}`,
      });
    }
  }
}
