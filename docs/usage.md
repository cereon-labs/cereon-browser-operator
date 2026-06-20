# Using Browser Operator

Browser Operator is the **"hands"** — a Chrome extension that lets software drive
your real, logged-in browser. It does nothing on its own; something has to connect
to it and send commands. This guide covers the two ways people use it:

- **[For end users](#for-end-users)** — you use a product (such as **Cereon CRM**)
  whose AI can drive your browser, and you just need to switch it on.
- **[For developers](#for-developers)** — you want to drive a browser yourself, or
  embed Browser Operator inside your own product.

Jump to [Which path is for me?](#which-path-is-for-me) if you're not sure.

---

## For end users

You're using an app — for example **Cereon CRM** — whose assistant can open pages,
fill forms, and read results in **your own** browser. Switching it on is a one-time,
~30-second step. No tokens, no settings to type.

### 1. Install the extension

- **Chrome Web Store** — the easiest path (once your product links it). Works in any
  Chromium browser: Chrome, Edge, Brave, Arc.
- **Self-hosted / not yet published?** Load it unpacked: build `dist/` and add it at
  `chrome://extensions` → enable **Developer mode** → **Load unpacked**. See
  [Install & build](../README.md#install--build).

### 2. Connect it from the product

Open the product's browser-connect setting and click **Connect**. The product mints
the connection for you — there's nothing to copy or paste.

> **Example — Cereon CRM:** go to **Settings → MCP → Browser Operator** and click
> **Connect**.

### 3. Approve it

The extension's toolbar icon shows a small badge. Click the icon, and in the popup
press **Connect** to approve the request. The product flips to **Connected**. Done.

### 4. Use it

Just ask the product's AI in plain language, for example:

> _"Open example.com and take a screenshot."_
> _"Go to this profile and pull their recent posts."_
> _"Fill in this form with the contact's details and submit it."_

It runs in your browser, inside its own tab group, and the result comes back in the
chat.

### Is it safe?

- It only acts inside a **dedicated automation tab group** — your everyday tabs are
  off-limits.
- Your pages and data go **only** to the product you connected. There is no
  Browser-Operator cloud.
- You can **Disconnect** any time from the same place you connected.
- As with any AI that browses for you, treat untrusted pages with care and keep a
  human in the loop for sensitive actions. See [SECURITY.md](../SECURITY.md).

### Troubleshooting

- **The popup still says "No token configured" right after you clicked Connect** —
  the popup doesn't refresh while it's open. Close it and click the toolbar icon
  again; you should see the connection request, then press **Connect**.
- **Still no request after reopening** — reload the extension
  (`chrome://extensions` → **Reload**) and hard-refresh the product page
  (**Ctrl/Cmd+Shift+R**), then click **Connect** in the product again.
- **The product says your browser isn't connected** — the link may have dropped;
  open the connect setting and click **Connect** again.

---

## For developers

Browser Operator speaks one open [protocol](../PROTOCOL.md) — you choose how to
drive it. There are three paths; pick the one that matches what you're building.

### A. Use it directly as an MCP server (fastest)

Add the bundled MCP server to any MCP client (Claude Desktop / Code, Cursor, Cline)
and connect the extension in one click — no custom backend.

```jsonc
{
  "mcpServers": {
    "browser-operator": {
      "command": "npx",
      "args": ["-y", "cereon-browser-operator-mcp"],
    },
  },
}
```

Then open **`http://localhost:8787/pair`**, click the extension's toolbar icon, and
press **Connect**. Now ask your AI client: _"open example.com and screenshot it."_
Full setup: **[mcp-server/README](../mcp-server/README.md)**.

### B. Embed it in your product (a vendor platform)

Let your web app connect users' browsers with one click and drive them from your
**own** backend / MCP server. This is how **Cereon CRM** does it — the reference
implementation.

What you build:

1. **A backend that speaks the [protocol](../PROTOCOL.md).** A hosted relay with an
   SSE command stream (`GET /browser/events`) and a result sink
   (`POST /browser/result`), authenticated by a **per-user** token. The
   [reference server](../examples/reference-server.mjs) implements both transports
   on one port and is a good starting point.
2. **A one-click connect button** in your web app. Mint a per-user token, then emit
   the [`pair-offer`](../PROTOCOL.md#one-click-pairing-optional) via
   `window.postMessage` — the extension shows a confirm prompt and connects to your
   relay. Detect whether the extension is installed first with the `ping` / `pong`
   presence probe (same section).
3. **Drive the browser** from your agent or MCP tools by pushing commands onto that
   user's stream and reading the results back; track presence so you can show a
   live "connected" state.

The entire handoff is **vendor-neutral** — nothing about your product is compiled
into the extension, and one published build serves every vendor. (Cereon CRM is one
such vendor: it surfaces the browser tools through its own MCP server and a "Connect
browser" button in **Settings → MCP**, minting a per-user key and emitting the
`pair-offer` — no Cereon-specific code lives in this extension.)

Reference: **[PROTOCOL.md → One-click pairing](../PROTOCOL.md#one-click-pairing-optional)**.

### C. Custom backend / scripting

Drive it from your own script or a non-MCP agent loop by implementing the
[protocol](../PROTOCOL.md) directly. See **[use-cases.md](use-cases.md)** — Recipe 1
wires any LLM into a browser-agent loop in ~30 lines, and Recipe 5 covers driving it
from your own product in any language.

---

## Which path is for me?

| You are…                                                 | Use                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A **user** of a product that supports Browser Operator   | [For end users](#for-end-users)                                                 |
| A **developer** who wants a browser MCP server right now | [Path A — direct MCP server](#a-use-it-directly-as-an-mcp-server-fastest)       |
| A **product builder** embedding it for your users        | [Path B — embed in your product](#b-embed-it-in-your-product-a-vendor-platform) |
| Doing **scripting / non-MCP** automation                 | [Path C — custom backend](#c-custom-backend--scripting)                         |

See also: [PROTOCOL.md](../PROTOCOL.md) (the wire contract) ·
[use-cases.md](use-cases.md) (recipes) ·
[comparison.md](comparison.md) (how it compares to Playwright MCP & others).
