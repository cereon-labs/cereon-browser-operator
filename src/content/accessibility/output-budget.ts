/**
 * A character-bounded string accumulator.
 *
 * The original tree builder tracked truncation with a closure over three
 * mutable locals; this class names that concern. Once the budget is exceeded it
 * appends a "(truncated)" marker and refuses further writes.
 */
export class OutputBudget {
  private output = "";
  private count = 0;
  private exhausted = false;

  constructor(private readonly max: number) {}

  get truncated(): boolean {
    return this.exhausted;
  }

  /** Append text; returns false once the budget is spent. */
  append(text: string): boolean {
    if (this.exhausted) return false;
    if (this.count + text.length > this.max) {
      this.output += text.substring(0, this.max - this.count);
      this.output += "\n... (truncated)";
      this.exhausted = true;
      return false;
    }
    this.output += text;
    this.count += text.length;
    return true;
  }

  toString(): string {
    return this.output;
  }
}
