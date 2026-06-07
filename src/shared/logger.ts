/**
 * Tiny structured logger.
 *
 * Every message is prefixed with a scope so logs from the SSE loop, CDP layer,
 * and tools are distinguishable in the service-worker console. This replaces the
 * silent `catch {}` blocks: non-fatal failures now leave a breadcrumb instead of
 * vanishing.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  child(scope: string): Logger;
}

const PREFIX = "[browser-operator]";

class ConsoleLogger implements Logger {
  constructor(private readonly scope: string) {}

  private tag(): string {
    return this.scope ? `${PREFIX} ${this.scope}` : PREFIX;
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(this.tag(), message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(this.tag(), message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.tag(), message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.tag(), message, ...args);
  }

  child(scope: string): Logger {
    const next = this.scope ? `${this.scope}:${scope}` : scope;
    return new ConsoleLogger(next);
  }
}

/** Root logger. Use `.child("scope")` to derive a scoped logger per module. */
export const logger: Logger = new ConsoleLogger("");
