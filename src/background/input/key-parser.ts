/**
 * Parses human key syntax ("Ctrl+Shift+A", "Enter") into CDP inputs.
 *
 * The original had two near-identical functions — `parseKeyCombo` and
 * `parseModifierString` — that both hand-rolled the same modifier lookup. Here a
 * single `MODIFIER_BITS` table backs both `parseModifiers` and `parseCombo`
 * (DRY). Pure and side-effect free, so it is exhaustively unit tested.
 */

/** CDP modifier bitmask values. */
export const MODIFIER_BITS = {
  alt: 1,
  ctrl: 2,
  control: 2,
  meta: 4,
  cmd: 4,
  command: 4,
  win: 4,
  windows: 4,
  shift: 8,
} as const;

const KEY_MAP: Record<string, string> = {
  enter: "Enter",
  return: "Enter",
  tab: "Tab",
  escape: "Escape",
  esc: "Escape",
  backspace: "Backspace",
  delete: "Delete",
  space: "Space",
  " ": "Space",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  f1: "F1",
  f2: "F2",
  f3: "F3",
  f4: "F4",
  f5: "F5",
  f6: "F6",
  f7: "F7",
  f8: "F8",
  f9: "F9",
  f10: "F10",
  f11: "F11",
  f12: "F12",
};

export interface KeyCombo {
  key: string;
  modifiers: number;
}

export class KeyParser {
  /** Sum the modifier bits in a "+"-separated string (non-modifiers ignored). */
  parseModifiers(input: string | undefined): number {
    if (!input) return 0;
    let mask = 0;
    for (const part of this.parts(input)) {
      mask |= this.modifierBit(part);
    }
    return mask;
  }

  /** Split a combo into its modifier mask and resolved key name. */
  parseCombo(input: string): KeyCombo {
    let modifiers = 0;
    let key = "";
    for (const part of this.parts(input)) {
      const bit = this.modifierBit(part);
      if (bit) modifiers |= bit;
      else key = KEY_MAP[part] ?? part;
    }
    return { key, modifiers };
  }

  private parts(input: string): string[] {
    return input.split("+").map((p) => p.trim().toLowerCase());
  }

  private modifierBit(part: string): number {
    return MODIFIER_BITS[part as keyof typeof MODIFIER_BITS] ?? 0;
  }
}
