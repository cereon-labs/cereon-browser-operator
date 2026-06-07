# Browser Operator Protocol

The open standard for driving a browser from **any** AI backend or LLM —
vendor-neutral, model-agnostic, and self-hostable.

This document is the contract between the extension and **any** backend. If your
software can deliver commands and accept results per this spec, the extension can
drive the browser for it. There is nothing vendor-specific here — this is what makes
Browser Operator an [open alternative to closed agents like Claude for Chrome](docs/comparison.md).

A reference implementation lives in [`examples/`](examples/).

---

## Roles

- **Backend** — your software. Sends commands, receives results, authenticates the extension.
- **Extension** — runs each command via the Chrome DevTools Protocol against a tab in its automation tab group, and returns the result.

## Message shapes

### Command (backend → extension)

```jsonc
{
  "id": "string", // unique per command; echoed back as commandId
  "tool": "string", // a tool name from the catalog below
  "args": {}, // tool-specific arguments
}
```

### Result (extension → backend)

```jsonc
{ "commandId": "string", "result": { "content": [ /* ContentBlock */ ] } }
// or
{ "commandId": "string", "error": "string" }
```

### ContentBlock

```jsonc
{ "type": "text", "text": "string" }
// or
{ "type": "image", "data": "<base64>", "mimeType": "image/jpeg" }
```

---

## Transports

A backend implements **one** of these (the user picks it in the extension's
Options). Both carry the exact same command/result payloads above.

### 1. SSE + HTTP

- **Commands:** the extension opens `GET {serverUrl}{commandPath}` with
  `Authorization: Bearer <token>` and reads an SSE stream. Emit each command as one event:
  ```
  data: {"id":"…","tool":"…","args":{…}}\n\n
  ```
- **Results:** the extension `POST`s to `{serverUrl}{resultPath}` with the bearer
  header and a JSON result body.
- **Server-initiated disconnect:** send an event `event: disconnect\ndata: bye\n\n`;
  the extension drops its credentials and stops.
- **Revocation:** answer the command stream with `401` to force re-auth.
- `commandPath` / `resultPath` may contain `{target}`, replaced by the configured/issued target id.

### 2. WebSocket

One socket, JSON frames:

```jsonc
// extension → backend, first frame after open:
{ "type": "auth", "token": "string", "target": "string?" }
// backend → extension:
{ "type": "auth_ok" }                 // optional ack
{ "type": "command", "id": "…", "tool": "…", "args": {…} }
{ "type": "error", "message": "string" }
// extension → backend:
{ "type": "result", "commandId": "…", "result": {…} }   // or { …, "error": "…" }
```

- Reject a bad token by closing with code **4001** (the extension clears the token and stops).

---

## Authentication

The extension authenticates with a **bearer token** the transport carries. The
developer pastes a token your backend issues into the Options page; it is sent as
`Authorization: Bearer <token>` (SSE/HTTP) or in the first WebSocket frame. This
works regardless of the extension's id and needs no accounts or consent flow.

A backend is free to layer its own authorization on top (issue per-user tokens,
expire them, scope them to a `target`) — the extension only needs the resulting
token.

> The bundled **[MCP server](mcp-server/)** is a reference backend: it speaks this
> protocol over WebSocket + token and re-exposes the tool catalog below to any MCP
> client (Claude Desktop, Cursor, Cline, Claude Code).

---

## Tool catalog

The standard tools (the `tool` field). Most operate on a `tabId` obtained from
`tabs_context_mcp`. Arguments mirror the extension's handlers.

| Tool                                                                   | Purpose                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs_context_mcp`                                                     | Context for the automation tab group; `{ createIfEmpty?: boolean }`. Call first.                                                                                                                  |
| `tabs_create_mcp`                                                      | Create a new tab in the group.                                                                                                                                                                    |
| `navigate`                                                             | `{ url, tabId }` — load a URL, or `"back"`/`"forward"`.                                                                                                                                           |
| `computer`                                                             | `{ action, tabId, … }` — 13 actions: `screenshot`, `left_click`, `right_click`, `double_click`, `triple_click`, `hover`, `type`, `key`, `scroll`, `scroll_to`, `wait`, `left_click_drag`, `zoom`. |
| `read_page`                                                            | `{ tabId, filter?, depth?, max_chars?, ref_id? }` — accessibility tree with element refs.                                                                                                         |
| `get_page_text`                                                        | `{ tabId }` — readable page text.                                                                                                                                                                 |
| `find`                                                                 | `{ query, tabId }` — find elements; returns refs + coordinates.                                                                                                                                   |
| `form_input`                                                           | `{ ref, value, tabId }` — set an input/select/checkbox.                                                                                                                                           |
| `javascript_tool`                                                      | `{ text, tabId }` — evaluate JS in the page.                                                                                                                                                      |
| `read_console_messages`                                                | `{ tabId, pattern?, limit?, onlyErrors?, clear? }`.                                                                                                                                               |
| `read_network_requests`                                                | `{ tabId, urlPattern?, limit?, clear? }`.                                                                                                                                                         |
| `resize_window`                                                        | `{ width, height, tabId }`.                                                                                                                                                                       |
| `upload_image`                                                         | `{ imageId, tabId, ref?, coordinate? }`.                                                                                                                                                          |
| `update_plan`                                                          | `{ domains, approach }` — echoes a plan (auto-approved).                                                                                                                                          |
| `gif_creator`, `shortcuts_list`, `shortcuts_execute`, `switch_browser` | Reserved / not-yet-implemented; return an informational message.                                                                                                                                  |

Only tabs inside the extension's automation tab group accept commands — this is
the security boundary. Unknown tools return `{ error: "Unknown tool: …" }`.
