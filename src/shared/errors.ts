/**
 * Typed error hierarchy.
 *
 * Replaces the old `catch {}` silences with named errors that carry context. A
 * single `code` discriminant lets callers (and the logger) branch without string
 * matching on messages.
 */

export type ErrorCode = "AUTH" | "SSE" | "CDP" | "TOOL" | "CONTENT_BRIDGE" | "VALIDATION";

/** Base class for every error this extension throws deliberately. */
export class OperatorError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class AuthError extends OperatorError {
  constructor(message: string, options?: ErrorOptions) {
    super("AUTH", message, options);
  }
}

export class SseError extends OperatorError {
  constructor(message: string, options?: ErrorOptions) {
    super("SSE", message, options);
  }
}

export class CdpError extends OperatorError {
  constructor(message: string, options?: ErrorOptions) {
    super("CDP", message, options);
  }
}

export class ToolError extends OperatorError {
  constructor(message: string, options?: ErrorOptions) {
    super("TOOL", message, options);
  }
}

export class ContentBridgeError extends OperatorError {
  constructor(message: string, options?: ErrorOptions) {
    super("CONTENT_BRIDGE", message, options);
  }
}

export class ValidationError extends OperatorError {
  constructor(message: string, options?: ErrorOptions) {
    super("VALIDATION", message, options);
  }
}

/** Normalize any thrown value to a human-readable message. */
export function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return JSON.stringify(err);
}
