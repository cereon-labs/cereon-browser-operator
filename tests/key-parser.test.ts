import { describe, expect, it } from "vitest";
import { KeyParser, MODIFIER_BITS } from "../src/background/input/key-parser";

const parser = new KeyParser();

describe("KeyParser.parseModifiers", () => {
  it("returns 0 for undefined/empty", () => {
    expect(parser.parseModifiers(undefined)).toBe(0);
    expect(parser.parseModifiers("")).toBe(0);
  });

  it("maps each modifier to its CDP bit", () => {
    expect(parser.parseModifiers("alt")).toBe(MODIFIER_BITS.alt); // 1
    expect(parser.parseModifiers("ctrl")).toBe(MODIFIER_BITS.ctrl); // 2
    expect(parser.parseModifiers("meta")).toBe(MODIFIER_BITS.meta); // 4
    expect(parser.parseModifiers("shift")).toBe(MODIFIER_BITS.shift); // 8
  });

  it("treats control/cmd/command/win aliases consistently", () => {
    expect(parser.parseModifiers("control")).toBe(2);
    expect(parser.parseModifiers("cmd")).toBe(4);
    expect(parser.parseModifiers("command")).toBe(4);
    expect(parser.parseModifiers("win")).toBe(4);
  });

  it("ORs multiple modifiers and ignores non-modifiers", () => {
    expect(parser.parseModifiers("Ctrl+Shift")).toBe(2 | 8);
    expect(parser.parseModifiers("ctrl+shift+a")).toBe(2 | 8);
    expect(parser.parseModifiers("ctrl + alt + meta")).toBe(2 | 1 | 4);
  });
});

describe("KeyParser.parseCombo", () => {
  it("resolves named keys via the key map", () => {
    expect(parser.parseCombo("enter")).toEqual({ key: "Enter", modifiers: 0 });
    expect(parser.parseCombo("esc")).toEqual({ key: "Escape", modifiers: 0 });
    expect(parser.parseCombo("up")).toEqual({ key: "ArrowUp", modifiers: 0 });
  });

  it("splits modifiers from the key", () => {
    expect(parser.parseCombo("Ctrl+Shift+A")).toEqual({ key: "a", modifiers: 2 | 8 });
    expect(parser.parseCombo("Meta+Enter")).toEqual({ key: "Enter", modifiers: 4 });
  });

  it("passes through unknown single keys lowercased", () => {
    expect(parser.parseCombo("z")).toEqual({ key: "z", modifiers: 0 });
  });
});
