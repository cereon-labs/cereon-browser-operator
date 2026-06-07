/**
 * Builds the right auth provider and transport from a connection config.
 *
 * The composition root calls these on startup and whenever the config changes,
 * so adding a transport/auth mode is a switch arm here — nothing else changes.
 */

import type { ConnectionConfig } from "../../config/connection-config";
import type { AuthProvider } from "../auth/auth-provider";
import { TokenAuth } from "../auth/token-auth";
import { ExponentialBackoff } from "../net/backoff";
import { SseHttpTransport } from "./sse-http-transport";
import type { Transport, TransportCallbacks } from "./transport";
import { WebSocketTransport } from "./websocket-transport";

export function buildAuth(config: ConnectionConfig): AuthProvider {
  return new TokenAuth(config);
}

export function buildTransport(
  config: ConnectionConfig,
  auth: AuthProvider,
  callbacks: TransportCallbacks,
): Transport {
  switch (config.transport) {
    case "websocket":
      return new WebSocketTransport(config, auth, new ExponentialBackoff(), callbacks);
    case "sse-http":
    default:
      return new SseHttpTransport(config, auth, new ExponentialBackoff(), callbacks);
  }
}
