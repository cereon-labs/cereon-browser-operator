/**
 * A fixed-capacity FIFO buffer.
 *
 * Console messages, network requests, and screenshots all needed the same
 * "append, then drop the oldest past N" behavior — it was copy-pasted three
 * times in the original background.js. This single generic owns that rule.
 */
export class RingBuffer<T> {
  private readonly items: T[] = [];

  constructor(private readonly capacity: number) {
    if (capacity <= 0) throw new RangeError("RingBuffer capacity must be > 0");
  }

  /** Append one item, evicting the oldest if at capacity. */
  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.capacity) {
      this.items.splice(0, this.items.length - this.capacity);
    }
  }

  /** A snapshot of the current contents (oldest first). */
  toArray(): T[] {
    return [...this.items];
  }

  /** Drop everything. */
  clear(): void {
    this.items.length = 0;
  }

  get size(): number {
    return this.items.length;
  }
}
