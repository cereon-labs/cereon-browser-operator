/**
 * Stable element references backed by WeakRefs.
 *
 * Assigns each DOM element a durable `ref_N` id that survives re-renders while
 * still allowing garbage collection — a `WeakRef` forward map plus a `WeakMap`
 * reverse map. When an element is collected, its ref resolves to null and is
 * pruned lazily.
 */
export class ElementRegistry {
  private counter = 0;
  private readonly forward = new Map<string, WeakRef<Element>>();
  private readonly reverse = new WeakMap<Element, string>();

  /** Get the element's existing ref, or assign a new one. */
  getOrAssign(el: Element): string {
    const existing = this.reverse.get(el);
    if (existing && this.forward.get(existing)?.deref() === el) return existing;

    const ref = `ref_${++this.counter}`;
    this.forward.set(ref, new WeakRef(el));
    this.reverse.set(el, ref);
    return ref;
  }

  /** Resolve a ref to its element, pruning the entry if it was collected. */
  resolve(refId: string): Element | null {
    const weak = this.forward.get(refId);
    if (!weak) return null;
    const el = weak.deref();
    if (!el) {
      this.forward.delete(refId);
      return null;
    }
    return el;
  }
}
