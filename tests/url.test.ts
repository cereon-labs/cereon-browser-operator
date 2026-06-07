import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/shared/errors";
import { normalizeUrl } from "../src/shared/url";

describe("normalizeUrl", () => {
  it("passes through http(s) URLs untouched", () => {
    expect(normalizeUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("passes through browser scheme URLs untouched", () => {
    expect(normalizeUrl("about:blank")).toBe("about:blank");
    expect(normalizeUrl("chrome://extensions")).toBe("chrome://extensions");
  });

  it("prepends https:// to bare hosts", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("example.com/path?q=1")).toBe("https://example.com/path?q=1");
  });

  it("strips a stray leading scheme then prepends https://", () => {
    expect(normalizeUrl("ftp://example.com")).toBe("https://example.com");
  });

  it("throws ValidationError on unparseable input", () => {
    expect(() => normalizeUrl("http://")).toThrow(ValidationError);
  });
});
