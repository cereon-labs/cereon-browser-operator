/**
 * Transport abstraction.
 *
 * A transport owns the connection to the backend in BOTH directions: it receives
 * commands and sends results. The dispatcher and composition root depend only on
 * this interface, so swapping SSE/HTTP for WebSocket (or anything future) touches
 * no tool, CDP, or content code.
 */

import type { CommandMessage, CommandResult } from "../../shared/messages";

export interface TransportCallbacks {
  /** A command arrived from the backend. */
  onCommand(command: CommandMessage): void;
  /** Connection status changed (drives the popup status). */
  onStatus(status: { connected: boolean; error?: string }): void;
}

export interface Transport {
  /** Connect and begin receiving commands. Safe to call when unconfigured (no-ops with a status). */
  start(): Promise<void>;
  /** Disconnect and cancel any in-flight work. */
  stop(): void;
  /** Send a command result back to the backend. Best-effort; must not throw. */
  sendResult(result: CommandResult): Promise<void>;
  readonly isRunning: boolean;
}
