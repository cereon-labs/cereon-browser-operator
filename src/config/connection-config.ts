/**
 * Runtime connection configuration.
 *
 * This is what decouples the extension from any single backend: the transport,
 * server URL, endpoint paths, and token are all data entered in the Options page
 * rather than compiled-in constants. A backend just has to speak the protocol in
 * PROTOCOL.md.
 */

export type TransportKind = "sse-http" | "websocket";

export interface ConnectionConfig {
  /** How commands/results travel. */
  transport: TransportKind;
  /** Base origin (sse-http) or full ws(s):// URL (websocket). */
  serverUrl: string;
  /** sse-http: path of the command stream. May contain `{target}`. */
  commandPath: string;
  /** sse-http: path results are POSTed to. May contain `{target}`. */
  resultPath: string;
  /** Optional opaque channel id substituted for `{target}` and sent to the backend. */
  target?: string;
  /** The bearer token pasted by the developer (issued by their backend). */
  token?: string;
}

/** Vendor-neutral defaults: local-first, nothing pre-filled. */
export const DEFAULT_CONFIG: ConnectionConfig = {
  transport: "sse-http",
  serverUrl: "",
  commandPath: "/browser/events",
  resultPath: "/browser/result",
};

/** Substitute the optional `{target}` placeholder in an endpoint path. */
export function resolvePath(template: string, target?: string): string {
  return template.replace(/\{target\}/g, target ?? "");
}

/**
 * Validate a config; returns a list of human-readable problems (empty = valid).
 * Pure — unit tested without chrome.* or the network.
 */
export function validateConfig(config: ConnectionConfig): string[] {
  const errors: string[] = [];

  if (!config.serverUrl.trim()) {
    errors.push("Server URL is required.");
  } else if (!isValidServerUrl(config.serverUrl, config.transport)) {
    errors.push(
      config.transport === "websocket"
        ? "Server URL must be a ws:// or wss:// URL for the WebSocket transport."
        : "Server URL must be an http:// or https:// URL.",
    );
  }

  if (config.transport === "sse-http") {
    if (!config.commandPath.trim())
      errors.push("Command path is required for the SSE/HTTP transport.");
    if (!config.resultPath.trim())
      errors.push("Result path is required for the SSE/HTTP transport.");
  }

  if (!config.token?.trim()) errors.push("A token is required.");

  return errors;
}

function isValidServerUrl(value: string, transport: TransportKind): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return transport === "websocket"
    ? url.protocol === "ws:" || url.protocol === "wss:"
    : url.protocol === "http:" || url.protocol === "https:";
}
