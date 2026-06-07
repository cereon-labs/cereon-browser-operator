import { describe, expect, it } from "vitest";
import { ExponentialBackoff } from "../src/background/net/backoff";

describe("ExponentialBackoff", () => {
  it("doubles from the initial delay up to the cap", () => {
    const backoff = new ExponentialBackoff(1000, 30000, 2);
    expect(backoff.next()).toBe(1000);
    expect(backoff.next()).toBe(2000);
    expect(backoff.next()).toBe(4000);
    expect(backoff.next()).toBe(8000);
    expect(backoff.next()).toBe(16000);
    expect(backoff.next()).toBe(30000); // capped (would be 32000)
    expect(backoff.next()).toBe(30000); // stays capped
  });

  it("resets back to the initial delay", () => {
    const backoff = new ExponentialBackoff(1000, 30000, 2);
    backoff.next();
    backoff.next();
    backoff.reset();
    expect(backoff.next()).toBe(1000);
  });
});
