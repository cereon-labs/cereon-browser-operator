/**
 * Typed message contracts shared across the three extension contexts.
 *
 * These types are the seams between the service worker, the content script, and
 * the popup. Keeping them in one module means a change to a wire format is a
 * compile error on both ends rather than a silent runtime mismatch.
 */

// ─── MCP tool results ────────────────────────────────────────────────────────

/** A single MCP content block returned to the CRM. */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

/** The envelope every tool resolves with. */
export interface ToolResult {
  content: ContentBlock[];
}

/** Helpers for the two common result shapes — used everywhere a tool returns. */
export const text = (value: string): ToolResult => ({
  content: [{ type: "text", text: value }],
});

export const textAndImage = (value: string, data: string, mimeType = "image/jpeg"): ToolResult => ({
  content: [
    { type: "text", text: value },
    { type: "image", data, mimeType },
  ],
});

// ─── SSE command stream ──────────────────────────────────────────────────────

/** A tool invocation pushed from the CRM over the SSE channel. */
export interface CommandMessage {
  id: string;
  tool: string;
  args: Record<string, unknown>;
}

/** Result posted back to the CRM for a given command. */
export type CommandResult =
  | { commandId: string; result: ToolResult }
  | { commandId: string; error: string };

// ─── Content-script protocol (background → content) ──────────────────────────

export interface AccessibilityTreeOptions {
  filter?: "all" | "interactive";
  depth?: number;
  max_chars?: number;
  ref_id?: string;
}

/** Discriminated union of every request the background sends to the content script. */
export type ContentMessage =
  | { type: "generateAccessibilityTree"; options?: AccessibilityTreeOptions }
  | { type: "getPageText" }
  | { type: "findElements"; query: string }
  | { type: "setFormValue"; ref: string; value: unknown }
  | { type: "getRefCoordinates"; ref: string }
  | { type: "scrollToRef"; ref: string };

export interface FoundElement {
  ref: string;
  role: string;
  name: string;
  coordinates: [number, number];
}

export interface FormSetResult {
  success?: boolean;
  value?: string;
  checked?: boolean;
  error?: string;
}

export interface Point {
  x: number;
  y: number;
}

/** Maps each content message `type` to the payload shape it resolves with. */
export interface ContentResultMap {
  generateAccessibilityTree: string;
  getPageText: string;
  findElements: FoundElement[];
  setFormValue: FormSetResult;
  getRefCoordinates: Point | null;
  scrollToRef: { success: boolean };
}

/** Wire envelope the content script replies with. */
export interface ContentResponse<T = unknown> {
  result: T;
}

// ─── Popup ↔ background protocol ─────────────────────────────────────────────

export type PopupRequest = { type: "connect" } | { type: "getStatus" } | { type: "disconnect" };

export interface StatusUpdate {
  type: "statusUpdate";
  connected: boolean;
  /** Optional human label for the active connection (e.g. workspace or host). */
  label?: string;
  error?: string;
}

export interface StatusResponse {
  connected: boolean;
  label?: string;
}

export interface ConnectAck {
  ok: boolean;
  error?: string;
}
