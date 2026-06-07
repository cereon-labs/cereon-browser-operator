import { describe, expect, it } from "vitest";
import { RingBuffer } from "../src/shared/ring-buffer";

describe("RingBuffer", () => {
  it("retains items in FIFO order under capacity", () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    expect(buf.toArray()).toEqual([1, 2]);
    expect(buf.size).toBe(2);
  });

  it("evicts the oldest items past capacity", () => {
    const buf = new RingBuffer<number>(3);
    [1, 2, 3, 4, 5].forEach((n) => buf.push(n));
    expect(buf.toArray()).toEqual([3, 4, 5]);
    expect(buf.size).toBe(3);
  });

  it("clears its contents", () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.clear();
    expect(buf.toArray()).toEqual([]);
    expect(buf.size).toBe(0);
  });

  it("rejects a non-positive capacity", () => {
    expect(() => new RingBuffer<number>(0)).toThrow(RangeError);
  });
});
