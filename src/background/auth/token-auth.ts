/**
 * Token authentication.
 *
 * The developer generates a token in their backend and pastes it into the
 * Options page; it lives in the connection config. There is no interactive flow,
 * so this works regardless of the extension's id — which is what keeps the
 * extension vendor-neutral.
 */

import type { ConnectionConfig } from "../../config/connection-config";
import { AuthError } from "../../shared/errors";
import type { AuthProvider, AuthState } from "./auth-provider";

export class TokenAuth implements AuthProvider {
  constructor(private readonly config: ConnectionConfig) {}

  async authorize(): Promise<AuthState> {
    const state = await this.current();
    if (!state) {
      throw new AuthError("No token configured. Open Configure and paste a token.");
    }
    return state;
  }

  async current(): Promise<AuthState | null> {
    const token = this.config.token?.trim();
    if (!token) return null;
    const meta: Record<string, string> = {};
    if (this.config.target) meta.target = this.config.target;
    return { token, meta };
  }

  /** The token is config-managed; clearing it is the user's job in Options. */
  async clear(): Promise<void> {
    // no-op
  }
}
