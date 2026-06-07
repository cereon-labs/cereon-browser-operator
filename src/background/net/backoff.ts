/**
 * Reconnect backoff strategy.
 *
 * A small interface so the SSE client depends on the abstraction, not a concrete
 * curve — swap in jittered or linear backoff without touching the loop.
 */

import { BACKOFF } from "../../shared/constants";

export interface BackoffStrategy {
  /** The current delay to wait before the next attempt (ms). */
  next(): number;
  /** Reset after a successful connection. */
  reset(): void;
}

/** Doubling backoff capped at a maximum, starting from an initial delay. */
export class ExponentialBackoff implements BackoffStrategy {
  private current: number;

  constructor(
    private readonly initialMs: number = BACKOFF.initialMs,
    private readonly maxMs: number = BACKOFF.maxMs,
    private readonly factor: number = BACKOFF.factor,
  ) {
    this.current = initialMs;
  }

  next(): number {
    const delay = this.current;
    this.current = Math.min(this.current * this.factor, this.maxMs);
    return delay;
  }

  reset(): void {
    this.current = this.initialMs;
  }
}
