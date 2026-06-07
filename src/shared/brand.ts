/**
 * Fork-time branding.
 *
 * Everything a fork needs to re-skin the extension lives here. Change these
 * values (plus the name/description/icons in `static/manifest.json`) and the
 * popup, options page, and tab group follow. See BRANDING.md for the checklist.
 *
 * This file intentionally has NO vendor coupling — connecting to a specific
 * backend (e.g. Cereon CRM) is runtime configuration, not branding.
 */
export const brand = {
  /** Full product name shown in the popup header and options page title. */
  productName: "Browser Operator",
  /** Short name used in compact UI. */
  shortName: "Operator",
  /** Title given to the automation tab group (the security boundary). */
  tabGroupTitle: "Operator",
  /** Color of the automation tab group. */
  tabGroupColor: "blue" as `${chrome.tabGroups.Color}`,
  /** Project / docs home link shown in the popup footer. */
  homeUrl: "https://github.com/cereon-labs/cereon-browser-operator",
  /** Footer label next to the home link. */
  homeLabel: "Browser Operator",
  /** UI copy. */
  copy: {
    connectButton: "Connect",
    disconnectButton: "Disconnect",
    connecting: "Connecting…",
    connected: "Connected",
    disconnected: "Disconnected",
    configureLink: "Configure…",
    notConfigured: "Not configured — open Configure to set a server and token.",
  },
} as const;
