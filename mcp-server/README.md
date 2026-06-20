# Browser Operator — MCP server

Drive your **real Chrome browser** from any MCP client — Claude Desktop, Cursor,
Cline, Claude Code — with no custom backend. This is the turnkey way to use the
[Browser Operator](../README.md) extension.

```
AI client ──MCP (stdio)──► this server ──WS + token──► extension ──CDP──► page
```

The server plays two roles in one process: it exposes the [protocol tool
catalog](../PROTOCOL.md#tool-catalog) as MCP tools to your AI client, and it runs
a local WebSocket endpoint the extension connects to with a shared token.

## Setup

1. **Build + load the extension** (from the repo root): `pnpm install && pnpm build`,
   then load `dist/` at `chrome://extensions` (Developer mode → Load unpacked).
   That single root install also installs this server's deps — it's part of the
   pnpm workspace, so there's no separate `npm install` here.
2. **Add it to your MCP client.** Once published to npm, the simplest config needs
   nothing checked out — `npx` fetches and runs the server:

   ```json
   {
     "mcpServers": {
       "browser-operator": {
         "command": "npx",
         "args": ["-y", "cereon-browser-operator-mcp"],
         "env": { "OPERATOR_TOKEN": "dev-token" }
       }
     }
   }
   ```

   Developing against a local checkout instead? Point at the file directly:

   ```json
   {
     "mcpServers": {
       "browser-operator": {
         "command": "node",
         "args": ["/absolute/path/to/cereon-browser-operator/mcp-server/server.mjs"],
         "env": { "OPERATOR_TOKEN": "dev-token" }
       }
     }
   }
   ```

3. **Connect the extension.** Two ways:
   - **One-click (recommended):** open **`http://localhost:8787/pair`**. The page
     hands this server's token to the extension; click the extension's toolbar
     icon and press **Connect** to approve. No copy/paste.
   - **Manual:** popup → Configure… → transport **WebSocket**, auth **Token**,
     server URL `ws://localhost:8787`, token `dev-token`. **Save**, then **Connect**.

Now ask your AI client to use the browser — e.g. _"open example.com and screenshot
it."_ It calls `tabs_context_mcp` → `navigate` → `computer` under the hood.

## Configuration

| Env var               | Default     | Purpose                                                     |
| --------------------- | ----------- | ----------------------------------------------------------- |
| `OPERATOR_TOKEN`      | `dev-token` | Shared token the extension must present. Use a real secret. |
| `OPERATOR_WS_PORT`    | `8787`      | Local WebSocket port the extension connects to.             |
| `OPERATOR_TIMEOUT_MS` | `30000`     | Per-command timeout.                                        |

## How it maps to the protocol

Each MCP tool name and its arguments mirror [`PROTOCOL.md`](../PROTOCOL.md) exactly,
so the MCP surface **is** the protocol surface. Tool results (`text` / `image`
content blocks) pass straight through to MCP content. If no browser is connected,
tool calls return an error telling you to Connect the extension.

> Single-instance, local stdio bridge — the right shape for a developer driving
> their own browser. The WebSocket link is held for the life of the process, so
> the extension stays connected across MCP client tool calls.
