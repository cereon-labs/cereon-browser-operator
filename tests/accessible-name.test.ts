import { beforeEach, describe, expect, it } from "vitest";
import { getAccessibleName } from "../src/content/dom/accessible-name";

beforeEach(() => {
  document.body.innerHTML = "";
});

function mount(html: string): Element {
  document.body.innerHTML = html;
  return document.body.firstElementChild!;
}

describe("getAccessibleName", () => {
  it("prefers aria-label above all", () => {
    expect(getAccessibleName(mount('<button aria-label="Save">X</button>'))).toBe("Save");
  });

  it("resolves aria-labelledby ids", () => {
    document.body.innerHTML = '<span id="t">Hello</span><div aria-labelledby="t"></div>';
    const div = document.querySelector("div")!;
    expect(getAccessibleName(div)).toBe("Hello");
  });

  it("falls back to placeholder, title, then alt", () => {
    expect(getAccessibleName(mount('<input placeholder="Email" />'))).toBe("Email");
    expect(getAccessibleName(mount('<span title="Tip"></span>'))).toBe("Tip");
    expect(getAccessibleName(mount('<img alt="Logo" />'))).toBe("Logo");
  });

  it("uses an associated label[for]", () => {
    document.body.innerHTML = '<label for="e">Email</label><input id="e" />';
    expect(getAccessibleName(document.querySelector("input")!)).toBe("Email");
  });

  it("uses direct text for leaf-ish tags only", () => {
    expect(getAccessibleName(mount("<button>Click me</button>"))).toBe("Click me");
    expect(getAccessibleName(mount("<div>Not a name</div>"))).toBe("");
  });
});
