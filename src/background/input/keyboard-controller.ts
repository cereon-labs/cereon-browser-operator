/**
 * Keyboard input via CDP.
 *
 * `type` inserts literal text grapheme-by-grapheme; `pressKeys` dispatches key
 * combos (parsed by {@link KeyParser}) with optional repeats. The string→event
 * mapping lives here; the string→combo parsing lives in KeyParser.
 */

import { sleep } from "../../shared/async";
import { LIMITS, TIMING } from "../../shared/constants";
import type { CdpSession } from "../cdp/cdp-session";
import { KeyParser } from "./key-parser";

export class KeyboardController {
  private readonly parser = new KeyParser();

  constructor(private readonly session: CdpSession) {}

  /** Insert text exactly as written (no key interpretation). */
  async type(textValue: string): Promise<void> {
    for (const char of textValue) {
      await this.session.send("Input.insertText", { text: char });
      await sleep(TIMING.typeCharMs);
    }
  }

  /**
   * Press one or more space-separated key combos, `repeat` times each.
   * @returns the number of repeats performed (clamped).
   */
  async pressKeys(textValue: string, repeat = 1): Promise<number> {
    const times = Math.min(repeat, LIMITS.maxKeyRepeat);
    const combos = textValue.split(" ").filter(Boolean);
    for (let r = 0; r < times; r++) {
      for (const combo of combos) {
        await this.dispatchCombo(combo);
      }
    }
    return times;
  }

  private async dispatchCombo(combo: string): Promise<void> {
    const { key, modifiers } = this.parser.parseCombo(combo);
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    await this.session.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      modifiers,
      windowsVirtualKeyCode: key.length === 1 ? key.charCodeAt(0) : 0,
    });
    await this.session.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers });
    await sleep(TIMING.keyPressMs);
  }
}
