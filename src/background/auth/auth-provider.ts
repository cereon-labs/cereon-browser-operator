/**
 * Authentication abstraction.
 *
 * A transport asks an `AuthProvider` for the current credentials. This is the
 * seam that lets the extension authenticate to arbitrary backends, and keeps the
 * door open for additional auth modes without touching the transports.
 */

export interface AuthState {
  /** Bearer token / API key used by the transport. */
  token: string;
  /** Optional extras the transport may use, e.g. `{ target, label }`. */
  meta?: Record<string, string>;
}

export interface AuthProvider {
  /**
   * Obtain credentials, running an interactive flow if the mode requires one.
   * @throws when credentials cannot be obtained (message is user-facing).
   */
  authorize(): Promise<AuthState>;
  /** Return stored credentials without any interaction, or null if none. */
  current(): Promise<AuthState | null>;
  /** Forget stored credentials (called on revocation / disconnect). */
  clear(): Promise<void>;
}
