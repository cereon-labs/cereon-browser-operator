<p align="center">
  <img src="static/icons/icon128.png" width="80" alt="Cereon Browser Operator — open-source browser automation agent logo">
</p>

<h1 align="center">Cereon Browser Operator</h1>

<p align="center">
  <b>An open, self-hosted browser-control layer for AI agents.</b>
  <br/>
  A Manifest V3 extension that drives your <b>real, logged-in</b> browser over CDP,
  exposed as one open protocol any backend — and any LLM — can drive. Navigate, click,
  type, screenshot, read pages, fill forms, run JavaScript, and inspect console/network.
  MIT licensed. Bring your own model.
  <br/>
  <sub>by <a href="https://github.com/cereon-labs">Cereon Labs</a></sub>
</p>

<p align="center">
  <a href="https://github.com/cereon-labs/cereon-browser-operator/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/cereon-labs/cereon-browser-operator/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg"></a>
  <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4.svg">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6.svg">
  <img alt="Bring your own LLM" src="https://img.shields.io/badge/LLM-bring%20your%20own-8A2BE2.svg">
  <a href="CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
</p>

<p align="center">
  <a href="#use-it-from-any-mcp-client">Use with MCP</a> ·
  <a href="#how-it-compares">How it compares</a> ·
  <a href="#what-you-can-build">Use cases</a> ·
  <a href="PROTOCOL.md">Protocol</a> ·
  <a href="#faq">FAQ</a>
</p>

---

## What it is

Browser Operator is a **Manifest V3 Chrome/Chromium extension** that turns your
browser into a **CDP (Chrome DevTools Protocol) automation agent**. Your software
pushes `{ id, tool, args }` commands and receives `{ commandId, result }` back —
that's the entire contract ([PROTOCOL.md](PROTOCOL.md)).

It is the **browser-control layer — the "hands," not the "brain."** It doesn't ship
an LLM and doesn't decide what to do on its own. You point your own backend at it —
fastest path is the bundled **[MCP server](mcp-server/)**, so any MCP client ([Claude
Desktop](https://claude.ai/download), [Cursor](https://cursor.com),
[Cline](https://github.com/cline/cline), [Claude Code](https://www.claudecode.com))
drives your browser with no custom code. Or wire it to your own loop calling Claude,
GPT, Gemini, or a **local model** (Ollama / LM Studio), in any language. No vendor
lock-in, no cloud dependency, no per-seat subscription — **self-hosted AI browser
automation that you own end to end.**

- **MCP-native** — the bundled [`mcp-server/`](mcp-server/) exposes every tool to any MCP client; add one line to your config.
- **Pluggable transport** — SSE+HTTP (remote) or WebSocket (local), chosen in settings.
- **Token auth** — paste a token your backend (or the MCP server) issues. No accounts, no consent flow.
- **14 tools** (plus 4 reserved) — tabs, navigate, the multi-action `computer` (13 actions), accessibility tree, find, form input, JavaScript, console/network capture, and more ([catalog](PROTOCOL.md#tool-catalog)).
- **Configured at runtime** — one build, point it anywhere; nothing about a backend is compiled in.
- **Safe by design** — the extension only acts inside a dedicated **automation tab group**; your normal tabs are off-limits.

```
Your backend ──commands──►  Browser Operator  ──CDP──►  the page
Your backend ◄──results───  Browser Operator
            (SSE+HTTP or one WebSocket; see PROTOCOL.md)
```

<!-- Demo: record docs/assets/demo.gif (configure → connect → navigate → screenshot),
     then uncomment the line below. See docs/assets/README.md for the recording checklist. -->
<!-- <p align="center"><img src="docs/assets/demo.gif" width="720" alt="Browser Operator demo — connect to a backend, navigate, and screenshot a page"></p> -->

---

## Use it from any MCP client

The fastest path — no custom backend. The bundled **[MCP server](mcp-server/)** lets
Claude Desktop, Cursor, Cline, or Claude Code drive your real browser.

```bash
# One pnpm install at the repo root sets up the extension AND the MCP server
# (single workspace, single lockfile — no per-directory installs).
pnpm install
pnpm build          # then load ./dist in chrome://extensions
```

Add it to your MCP client config (`claude_desktop_config.json` / `.mcp.json`):

```json
{
  "mcpServers": {
    "browser-operator": {
      "command": "node",
      "args": ["/abs/path/to/cereon-browser-operator/mcp-server/server.mjs"],
      "env": { "OPERATOR_TOKEN": "dev-token" }
    }
  }
}
```

Once the MCP server is published to npm you can skip the local path and use
`"command": "npx"`, `"args": ["-y", "cereon-browser-operator-mcp"]` instead.

Then in the extension popup → **Configure…**: transport **WebSocket**, server URL
`ws://localhost:8787`, token `dev-token`. **Save** → **Connect**. Now ask your AI
client: _"open example.com and screenshot it."_ Full setup: **[mcp-server/](mcp-server/)**.

---

## How it compares

The tools Browser Operator actually competes with are **[Playwright MCP](https://github.com/microsoft/playwright-mcp)**
(Microsoft) and **[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)**
(Google) — both are mature, well-resourced ways to drive a browser from an agent. **For
most "let an agent drive a browser" jobs, reach for one of those first.** Browser
Operator is the better fit in a narrower band:

|                           | **Browser Operator**                                     | **Playwright MCP** / **Chrome DevTools MCP**                |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| **What it is**            | MV3 extension + open protocol                            | MCP server driving a managed/attached browser               |
| **Acts in your browser**  | **Yes, by default** — your real, open, logged-in session | Possible via a flag (persistent profile / connect-over-CDP) |
| **Embed & white-label**   | **Yes** — re-skin in one file, ship in your product      | Not a goal — consumed as a third-party MCP server           |
| **Driven over**           | An open protocol you point at your own backend           | MCP                                                         |
| **Maturity**              | New (2026), small surface                                | **Mature / official, broad ecosystem**                      |
| **Cross-browser / depth** | Any Chromium; tab-group safety boundary                  | Playwright: cross-browser · CDP MCP: perf traces, network   |

So pick Browser Operator when you specifically want an **extension that acts in the
user's real, logged-in browser**, **embedded and branded inside your own product**, over
a protocol you control. Otherwise Playwright MCP / Chrome DevTools MCP are the pragmatic
default.

Full breakdown — including the bundled agent _products_ (Claude for Chrome, Nanobrowser,
Browser Use, BrowserOS) — in **[docs/comparison.md](docs/comparison.md)**.

---

## Why developers choose Browser Operator

- **Open & MIT** — read every line, audit it, fork it, ship it. No black box.
- **Model- and framework-agnostic** — one [open protocol](PROTOCOL.md); wire up any LLM or no LLM. You're never locked to a vendor's model or roadmap.
- **Self-hosted & private** — runs on your machine; your pages and data don't go to anyone's cloud unless your backend sends them.
- **One build, point anywhere** — backends are runtime configuration, not compile-time. Switch from a localhost script to production without rebuilding.
- **Forkable & white-label** — re-skin the whole extension from one file and ship it inside your own product ([BRANDING.md](BRANDING.md)).
- **Safe by construction** — only tabs inside the automation tab group accept commands, so an agent can't reach into your everyday browsing.

---

## What you can build

Browser Operator is the automation surface for **agentic web workflows, QA, scraping,
and RPA**:

- **AI web agents** — let an LLM read a page (accessibility tree + text), pick a tool, act, and loop. [Wire any model in ~30 lines →](docs/use-cases.md)
- **Build-test-verify for coding agents** — pair with Claude Code: build in the terminal, then drive the browser to test and read console errors, network requests, and DOM state.
- **Data extraction / scraping** — `read_page` / `get_page_text` / `find` to pull structured data from rendered pages.
- **Form automation & RPA** — `form_input` + `computer` to fill and submit repetitive workflows.
- **Embed in your own product** — point the extension at your own server; anything that speaks the [protocol](PROTOCOL.md) can drive it.

Full recipes (incl. the LLM agent loop) in **[docs/use-cases.md](docs/use-cases.md)**.

---

## Quick start (custom backend / scripting)

Prefer to drive it yourself instead of via MCP? Try it end-to-end with the bundled
reference backend:

```bash
# 1. build + load the extension (the root install also covers examples/)
pnpm install && pnpm build          # then load ./dist in chrome://extensions

# 2. run the bundled reference server
OPERATOR_TOKEN=dev-token node examples/reference-server.mjs
```

In the extension popup → **Configure…**: transport **WebSocket**, auth **Token**,
server URL `ws://localhost:8787`, token `dev-token`. **Save**, then **Connect**.

Drive it:

```bash
node examples/cli-driver.mjs tabs_context_mcp '{"createIfEmpty":true}'   # note the tabId
node examples/cli-driver.mjs navigate '{"url":"example.com","tabId":123}'
node examples/cli-driver.mjs computer '{"action":"screenshot","tabId":123}'
```

See [`examples/`](examples/) for details, and [PROTOCOL.md](PROTOCOL.md) to build
your own backend.

---

## Project layout

TypeScript, bundled with esbuild into self-contained scripts. Source in `src/`,
static assets in `static/`, build output in `dist/`.

```
src/
├── shared/      # protocol types, brand config, errors, logger, constants, utils
├── config/      # ConnectionConfig + ConfigStore (runtime backend settings)
├── background/
│   ├── transport/   # Transport interface + SSE/HTTP + WebSocket + factory
│   ├── auth/        # AuthProvider + TokenAuth
│   ├── cdp/ input/ screenshot/ tabs/ content-bridge/   # the automation engine
│   └── tools/       # one class per tool (computer/ = action strategies)
├── content/     # in-page DOM introspection (a11y tree, find, forms)
├── options/     # settings page
└── popup/       # status + connect/disconnect
mcp-server/      # MCP server bridge (drive the browser from any MCP client)
examples/        # reference backend + CLI driver (implements PROTOCOL.md)
```

---

## Install & build

Requires Node.js 22+ and **pnpm**, plus any Chromium browser. This is a single
pnpm workspace — one `pnpm install` at the root wires up the extension, the
[MCP server](mcp-server/), and the [reference backend](examples/).

```bash
pnpm install
pnpm build      # bundles src/ -> dist/
```

Load unpacked: `chrome://extensions` → enable **Developer mode** → **Load unpacked**
→ select **`dist/`**. Each install gets its own extension id — exactly what an
independent, token-authenticated tool wants.

### Scripts

```bash
pnpm watch         # rebuild on change
pnpm typecheck     # tsc --noEmit (strict)
pnpm test          # Vitest unit suite
pnpm lint          # eslint
pnpm format        # prettier --write (format:check is the CI gate)
pnpm check         # format:check + lint + typecheck + test + build (the full CI gate)
```

---

## Configure a backend

Open **Configure…** from the popup and set:

- **Transport** — `SSE + HTTP` (remote server) or `WebSocket` (local).
- **Server URL** + (for SSE/HTTP) command/result paths, optional `target`.
- **Token** — the bearer token your backend (or the [MCP server](mcp-server/)) issues.

Then **Connect** from the popup. Implement the matching backend per
[PROTOCOL.md](PROTOCOL.md), or use the bundled [MCP server](mcp-server/) /
[reference server](examples/).

---

## Branding / forking

Re-skin in one file (`src/shared/brand.ts`) plus the manifest name and icons —
ship your own branded browser operator inside your product. See
[BRANDING.md](BRANDING.md).

---

## FAQ

### How is this different from Playwright MCP / Chrome DevTools MCP?

Those are mature, well-resourced MCP servers that drive a browser for an agent — for
most jobs they're the pragmatic default. Browser Operator's difference is that it's a
**Manifest V3 extension acting in the user's own, already-logged-in browser** by default,
driven over **an open protocol you can embed and white-label inside your own product**
(the bundled MCP server is just one backend). It's also an **open, self-hosted
alternative to closed first-party agents** like Claude for Chrome — you own the model,
the data path, and the brand. See the [comparison](#how-it-compares) for when to pick
which.

### Is it free? Do I need an API key?

The extension is free and MIT licensed. It needs **no API key** itself. If your
backend uses a hosted LLM, you bring (and pay for) that model's key — or run a
local model and pay nothing.

### What models / LLMs work with it?

Any of them, because the model lives in **your** backend, not the extension. Claude,
GPT, Gemini, Llama, local Ollama/LM Studio — or no LLM at all if you're scripting
deterministic automation. See [docs/use-cases.md](docs/use-cases.md).

### Can I self-host it? Is my data private?

It runs entirely on your machine and talks only to the backend URL you configure.
Your pages and data never leave your stack unless **your** backend chooses to send
them. There is no Browser-Operator cloud.

### Is it safe? What about prompt injection?

Any browser-using AI agent carries prompt-injection risk — malicious instructions
hidden in a page can try to hijack the agent. Browser Operator narrows the blast
radius: it only acts inside a **dedicated automation tab group** (your everyday tabs
are untouched), and **you** control the model, the system prompt, and the allowed
tools. Treat untrusted pages with the same caution you would any agent, and keep a
human in the loop for sensitive actions.

### Which browsers are supported?

Any Chromium-based browser that supports Manifest V3 and the debugger API — Chrome,
Edge, Brave, Arc, and others. (Claude for Chrome is Chrome-only.)

### How is it different from Nanobrowser / Browser Use?

Those bundle the agent loop and LLM calls **inside** the tool. Browser Operator is
the **control layer**: it exposes the browser over an open protocol and lets _your_
backend run the loop, in any language or framework. More flexible if you're building
your own agent; see [docs/comparison.md](docs/comparison.md).

### Do I need a specific backend?

No. Use the bundled [MCP server](mcp-server/) for any MCP client, the
[reference server](examples/) for scripting, or implement the [protocol](PROTOCOL.md)
in your own software. Nothing about any one backend is compiled in.

---

## Roadmap

Open foundation, built in the open. Roughly what's next — and where help is most
welcome (each is a self-contained contribution; see [CONTRIBUTING.md](CONTRIBUTING.md)):

- **Publish the MCP server to npm** so `npx -y cereon-browser-operator-mcp` just works — the release pipeline is wired, pending the first tagged release.
- **A recorded demo GIF + screenshots** for the README and a social-preview image (see [docs/assets/](docs/assets/)).
- **Implement the reserved tools** — `gif_creator` (in-browser recording), `shortcuts_list` / `shortcuts_execute`, `switch_browser` (currently honest stubs; see [PROTOCOL.md](PROTOCOL.md)).
- **More reference backends** in other languages (Python first) to sit alongside the Node example.
- **Broader example agent loops** — additional model providers wired in [docs/use-cases.md](docs/use-cases.md).
- **An end-to-end smoke test** that loads the unpacked extension into a headed Chrome in CI and drives a real navigate + screenshot — today's suite unit-tests the pure logic (parsers, transports, config); the CDP engine itself isn't yet exercised against a live browser.
- **Wider browser/CI coverage** — exercise the matrix against more Chromium builds.

Have an idea that isn't here?
[Open an issue or a discussion](https://github.com/cereon-labs/cereon-browser-operator/issues) —
the protocol is designed to be extended.

---

## Contributing

Browser Operator is community-driven and vendor-neutral — contributions welcome.
See [CONTRIBUTING.md](CONTRIBUTING.md). All PRs must pass
`pnpm check` (format · lint · typecheck · test · build) — the same gate CI runs.
If it helps you,
**[star the repo](https://github.com/cereon-labs/cereon-browser-operator)** and
[open an issue](https://github.com/cereon-labs/cereon-browser-operator/issues) with
ideas or bugs.

## Star history

If Browser Operator is useful to you, a ⭐ helps others find it.

<a href="https://star-history.com/#cereon-labs/cereon-browser-operator&Date">
  <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=cereon-labs/cereon-browser-operator&type=Date" width="640">
</a>

## License

MIT — built by [Cereon Labs](https://github.com/cereon-labs). Use it, fork it, ship it.
