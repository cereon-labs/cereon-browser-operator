# Browser Operator — reference backend & CLI

A minimal, dependency-light backend that implements the [Browser Operator
protocol](../PROTOCOL.md) over **both** transports, plus a CLI to drive the
extension. Use it to try the extension end-to-end without writing a backend, and
as a worked reference when you build your own.

## Run

Deps come from the workspace — a single `pnpm install` at the repo root sets this
up; there's no separate install in `examples/`. From the repo root:

```bash
OPERATOR_TOKEN=dev-token node examples/reference-server.mjs
```

The server listens on `:8787` and serves all three surfaces on that one port:

| Surface                      | Endpoint                                    |
| ---------------------------- | ------------------------------------------- |
| SSE/HTTP command stream      | `GET http://localhost:8787/browser/events`  |
| SSE/HTTP result sink         | `POST http://localhost:8787/browser/result` |
| WebSocket transport          | `ws://localhost:8787`                       |
| Driver API (used by the CLI) | `POST http://localhost:8787/commands`       |

## Configure the extension

Open the extension's **Configure…** page and either:

- **WebSocket (local):** transport `WebSocket`, auth `Token`, server URL
  `ws://localhost:8787`, token `dev-token`.
- **SSE/HTTP:** transport `SSE + HTTP`, auth `Token`, server URL
  `http://localhost:8787`, command path `/browser/events`, result path
  `/browser/result`, token `dev-token`.

Click **Connect** in the popup. The server logs `extension connected`.

## Drive it

```bash
# create a tab group + tab, note the tabId in the output
node examples/cli-driver.mjs tabs_context_mcp '{"createIfEmpty":true}'

# then, with that tabId:
node examples/cli-driver.mjs navigate '{"url":"example.com","tabId":123}'
node examples/cli-driver.mjs computer  '{"action":"screenshot","tabId":123}'
node examples/cli-driver.mjs read_page '{"tabId":123}'
```

Tool names are the protocol tool names listed in [PROTOCOL.md](../PROTOCOL.md).

## Hooking up your own agent

`POST /commands { tool, args }` blocks until the extension returns the result,
so any language/agent can drive the browser with a single HTTP call. Point your
own software at that endpoint, or implement the protocol directly (this file is
~150 lines and shows exactly how).

## Prefer MCP?

If you just want to drive the browser from an MCP client (Claude Desktop, Cursor,
Cline, Claude Code), skip this reference server and use the bundled
[MCP server](../mcp-server/) instead — no scripting required.

## Drive it with an LLM (build your own Claude for Chrome)

To turn this into an AI browser agent, put a model in the loop: show it the page
(`read_page` / `get_page_text`), let it pick a tool, `POST /commands`, feed the
result back, repeat. Swap Claude for GPT for a local Ollama model by changing one
function. See the **~30-line agent loop** and four more recipes in
[docs/use-cases.md](../docs/use-cases.md).
