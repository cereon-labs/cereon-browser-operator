import { describe, expect, it } from "vitest";
import { TokenAuth } from "../src/background/auth/token-auth";
import { DEFAULT_CONFIG, type ConnectionConfig } from "../src/config/connection-config";
import { AuthError } from "../src/shared/errors";

const withToken: ConnectionConfig = {
  ...DEFAULT_CONFIG,
  serverUrl: "https://x",
  token: "abc",
  target: "chan-1",
};

describe("TokenAuth", () => {
  it("returns the configured token and target as auth state", async () => {
    const auth = new TokenAuth(withToken);
    await expect(auth.current()).resolves.toEqual({ token: "abc", meta: { target: "chan-1" } });
    await expect(auth.authorize()).resolves.toEqual({ token: "abc", meta: { target: "chan-1" } });
  });

  it("returns null / throws when no token is configured", async () => {
    const auth = new TokenAuth(DEFAULT_CONFIG);
    await expect(auth.current()).resolves.toBeNull();
    await expect(auth.authorize()).rejects.toBeInstanceOf(AuthError);
  });

  it("clear is a no-op (token is config-managed)", async () => {
    const auth = new TokenAuth(withToken);
    await expect(auth.clear()).resolves.toBeUndefined();
  });
});
