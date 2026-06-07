import { vi } from "vitest";

// Minimal `chrome` stub so modules that touch the extension APIs can be imported
// under test. Individual specs override the pieces they exercise with vi.fn().
const chromeStub = {
  runtime: {
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
    lastError: undefined,
  },
  storage: {
    sync: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    group: vi.fn(),
    sendMessage: vi.fn(),
    onRemoved: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  tabGroups: { get: vi.fn(), query: vi.fn(), update: vi.fn() },
  windows: { create: vi.fn(), get: vi.fn(), update: vi.fn() },
  debugger: {
    attach: vi.fn(),
    detach: vi.fn(),
    sendCommand: vi.fn(),
    onEvent: { addListener: vi.fn() },
    onDetach: { addListener: vi.fn() },
  },
  scripting: { executeScript: vi.fn() },
  identity: { getRedirectURL: vi.fn(), launchWebAuthFlow: vi.fn() },
  alarms: { create: vi.fn(), onAlarm: { addListener: vi.fn() } },
};

vi.stubGlobal("chrome", chromeStub);

// jsdom does not implement CSS.escape (present in every real browser). Provide a
// spec-compliant-enough shim so accessible-name's label[for] lookup works.
if (typeof CSS === "undefined" || typeof CSS.escape !== "function") {
  vi.stubGlobal("CSS", {
    escape: (value: string) => value.replace(/([^\w-])/g, "\\$1"),
  });
}
