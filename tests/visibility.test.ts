import { describe, expect, it } from "vitest";
import { isInteractive, isVisible } from "../src/content/dom/visibility";

function el(html: string): Element {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild!;
}

describe("isInteractive", () => {
  it("recognizes natively interactive tags", () => {
    expect(isInteractive(el("<button></button>"))).toBe(true);
    expect(isInteractive(el("<a></a>"))).toBe(true);
    expect(isInteractive(el("<input />"))).toBe(true);
  });

  it("recognizes interactive ARIA roles", () => {
    expect(isInteractive(el('<div role="button"></div>'))).toBe(true);
    expect(isInteractive(el('<div role="switch"></div>'))).toBe(true);
  });

  it("recognizes tabindex, onclick, and contenteditable", () => {
    expect(isInteractive(el('<div tabindex="0"></div>'))).toBe(true);
    expect(isInteractive(el('<div onclick="x"></div>'))).toBe(true);
    expect(isInteractive(el('<div contenteditable="true"></div>'))).toBe(true);
  });

  it("treats plain containers as non-interactive", () => {
    expect(isInteractive(el("<div></div>"))).toBe(false);
    expect(isInteractive(el("<span></span>"))).toBe(false);
  });
});

describe("isVisible", () => {
  it("treats display:none and visibility:hidden as hidden", () => {
    expect(isVisible(el('<div style="display:none"></div>'))).toBe(false);
    expect(isVisible(el('<div style="visibility:hidden"></div>'))).toBe(false);
  });

  it("treats body as visible", () => {
    expect(isVisible(document.body)).toBe(true);
  });
});
