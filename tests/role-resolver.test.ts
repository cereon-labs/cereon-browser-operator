import { describe, expect, it } from "vitest";
import { getRole } from "../src/content/dom/role-resolver";

function el(html: string): Element {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild!;
}

describe("getRole", () => {
  it("honors an explicit role attribute", () => {
    expect(getRole(el('<div role="navigation"></div>'))).toBe("navigation");
  });

  it("maps common tags to roles", () => {
    expect(getRole(el("<a></a>"))).toBe("link");
    expect(getRole(el("<button></button>"))).toBe("button");
    expect(getRole(el("<select></select>"))).toBe("combobox");
    expect(getRole(el("<h2></h2>"))).toBe("heading");
  });

  it("derives input roles from the type", () => {
    expect(getRole(el('<input type="checkbox" />'))).toBe("checkbox");
    expect(getRole(el('<input type="search" />'))).toBe("searchbox");
    expect(getRole(el('<input type="number" />'))).toBe("spinbutton");
    expect(getRole(el("<input />"))).toBe("textbox");
  });

  it("returns null for tags with no role mapping", () => {
    expect(getRole(el("<div></div>"))).toBeNull();
  });
});
