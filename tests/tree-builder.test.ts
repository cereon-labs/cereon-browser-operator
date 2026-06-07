import { beforeEach, describe, expect, it, vi } from "vitest";

// jsdom does no layout, so force visibility; interactivity is irrelevant for the
// "all" filter under test.
vi.mock("../src/content/dom/visibility", () => ({
  isVisible: () => true,
  isInteractive: () => false,
}));

import { AccessibilityTreeBuilder } from "../src/content/accessibility/tree-builder";
import { ElementRegistry } from "../src/content/dom/element-registry";

beforeEach(() => {
  document.body.innerHTML = "";
});

function build(html: string) {
  document.body.innerHTML = html;
  return new AccessibilityTreeBuilder(new ElementRegistry()).build({ filter: "all" });
}

describe("AccessibilityTreeBuilder", () => {
  it("renders role, name, ref, and link href", () => {
    const out = build('<main><button>Hi</button><a href="https://x.com/">Link</a></main>');
    expect(out).toMatch(/main \[ref_\d+\]/);
    expect(out).toMatch(/button "Hi" \[ref_\d+\]/);
    expect(out).toContain('link "Link"');
    expect(out).toContain('href="https://x.com/"');
  });

  it("truncates when the character budget is exceeded", () => {
    document.body.innerHTML = `<main>${"<button>x</button>".repeat(50)}</main>`;
    const out = new AccessibilityTreeBuilder(new ElementRegistry()).build({
      filter: "all",
      max_chars: 60,
    });
    expect(out).toContain("(truncated)");
  });

  it("returns an error for an unknown ref_id", () => {
    const out = new AccessibilityTreeBuilder(new ElementRegistry()).build({ ref_id: "ref_999" });
    expect(out).toContain('ref_id "ref_999" not found');
  });
});
