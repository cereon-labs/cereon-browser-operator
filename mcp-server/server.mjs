#!/usr/bin/env node
// Browser Operator MCP server.
//
// Bridges any MCP client (Claude Desktop, Cursor, Cline, Claude Code) to the
// Browser Operator Chrome extension. One process, two faces:
//
//   AI client ──MCP (stdio)──► this server ──WS + token──► extension ──CDP──► page
//
//   - MCP (stdio): exposes the protocol tool catalog (PROTOCOL.md) as MCP tools.
//   - WebSocket  : the extension connects here and authenticates with a token;
//                  the same command/result framing as examples/reference-server.mjs.
//
// Run it directly or via an MCP client config (see README.md):
//   OPERATOR_TOKEN=dev-token node server.mjs
//
// Then in the extension Options: transport WebSocket, token auth, server URL
// ws://localhost:8787, token dev-token. Save, then Connect.
//
// IMPORTANT: stdout is the JSON-RPC channel — all logging goes to stderr.

import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const WS_PORT = Number(process.env.OPERATOR_WS_PORT ?? 8787);
const TOKEN = process.env.OPERATOR_TOKEN ?? "dev-token";
const COMMAND_TIMEOUT_MS = Number(process.env.OPERATOR_TIMEOUT_MS ?? 30_000);

const log = (...a) => console.error("[browser-operator-mcp]", ...a);

// ─── Extension link (WebSocket) ──────────────────────────────────────────────
/** The single connected, authenticated extension socket (or null). */
let extension = null;
/** commandId -> { resolve, timer } for in-flight commands. */
const pending = new Map();

// One-click pairing page. Serving an HTML page on the same port lets the user
// hand this server's token to the extension via the vendor-neutral pair-offer
// protocol (window.postMessage) — no copy/paste. The extension still requires an
// explicit in-popup confirm, so opening this page can't silently reconfigure it.
function pairPageHtml() {
  const offer = {
    __browserOperator: "pair-offer",
    config: { transport: "websocket", serverUrl: `ws://localhost:${WS_PORT}`, token: TOKEN },
    brand: { name: "Browser Operator (local MCP server)" },
  };
  // JSON-encode for the inline script, escaping `<` so a token can never break out.
  const json = JSON.stringify(offer).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect Browser Operator</title>
    <style>
      :root { color-scheme: light dark; }
      body { font: 15px/1.6 system-ui, sans-serif; max-width: 30rem; margin: 12vh auto; padding: 0 1.25rem; }
      h1 { font-size: 1.3rem; margin: 0 0 .5rem; }
      p { color: #555; } @media (prefers-color-scheme: dark) { p { color: #aaa; } }
      .ok { color: #16a34a; font-weight: 600; }
      ol { padding-left: 1.1rem; } li { margin: .35rem 0; }
      button { font: inherit; padding: .5rem .9rem; border-radius: .5rem; border: 1px solid #8884; cursor: pointer; background: transparent; color: inherit; }
    </style>
  </head>
  <body>
    <h1>Connect Browser Operator</h1>
    <p id="status">Offering a connection to the Browser Operator extension…</p>
    <ol>
      <li><strong>1.</strong> <span id="sent">Sending…</span></li>
      <li><strong>2.</strong> Click the <strong>Browser Operator</strong> icon in your browser toolbar, then press <strong>Connect</strong>.</li>
    </ol>
    <button id="resend" type="button">Re-send offer</button>
    <script>
      const offer = ${json};
      function send() {
        window.postMessage(offer, window.origin);
        document.getElementById("sent").innerHTML = '<span class="ok">Sent \\u2713</span> \\u2014 approve it in the extension popup.';
      }
      document.getElementById("resend").addEventListener("click", send);
      // If the extension is installed, its content script answers a ping.
      window.addEventListener("message", (e) => {
        if (e.source === window && e.data && e.data.__browserOperator === "pong") {
          document.getElementById("status").textContent =
            "Extension detected (" + (e.data.productName || "Browser Operator") + "). Offer sent below.";
        }
      });
      window.postMessage({ __browserOperator: "ping", nonce: "pairpage" }, window.origin);
      send();
    </script>
  </body>
</html>`;
}

const httpServer = http.createServer((req, res) => {
  const path = (req.url ?? "").split("?")[0];
  if (req.method === "GET" && path === "/pair") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(pairPageHtml());
    return;
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

const wss = new WebSocketServer({ server: httpServer });
httpServer.listen(WS_PORT, () =>
  log(
    `waiting for the extension on ws://localhost:${WS_PORT} — one-click pair: http://localhost:${WS_PORT}/pair`,
  ),
);
wss.on("connection", (ws) => {
  let authed = false;
  ws.on("message", (raw) => {
    let frame;
    try {
      frame = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!authed) {
      if (frame.type === "auth" && frame.token === TOKEN) {
        authed = true;
        extension = ws;
        ws.send(JSON.stringify({ type: "auth_ok" }));
        log("extension connected");
      } else {
        ws.close(4001, "auth rejected");
      }
      return;
    }
    if (frame.type === "result") resolveResult(frame);
  });
  ws.on("close", () => {
    if (extension === ws) extension = null;
    log("extension disconnected");
  });
  ws.on("error", (err) => log("ws error:", err.message));
});

function resolveResult({ commandId, result, error }) {
  const entry = pending.get(commandId);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(commandId);
  entry.resolve(error ? { error } : result);
}

/** Send one command to the connected extension and await its result. */
function runCommand(tool, args) {
  return new Promise((resolve, reject) => {
    if (!extension) {
      reject(
        new Error(
          `No browser connected. Open the Browser Operator extension and Connect (ws://localhost:${WS_PORT}).`,
        ),
      );
      return;
    }
    const id = randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Timed out waiting for the browser to return a result."));
    }, COMMAND_TIMEOUT_MS);
    pending.set(id, { resolve, timer });
    try {
      extension.send(JSON.stringify({ type: "command", id, tool, args: args ?? {} }));
    } catch (err) {
      clearTimeout(timer);
      pending.delete(id);
      reject(err);
    }
  });
}

/** Map a Browser Operator tool result onto MCP content. */
function toMcpResult(result) {
  if (result && typeof result === "object" && "error" in result) {
    return { content: [{ type: "text", text: String(result.error) }], isError: true };
  }
  const blocks = result?.content;
  if (Array.isArray(blocks) && blocks.length) {
    // ContentBlock shapes ({type:"text",text} | {type:"image",data,mimeType})
    // map 1:1 onto MCP content blocks.
    return { content: blocks };
  }
  return { content: [{ type: "text", text: JSON.stringify(result ?? {}, null, 2) }] };
}

// ─── Tool catalog (mirrors PROTOCOL.md) ──────────────────────────────────────
const tabId = z.number().int().describe("Tab id from tabs_context (the automation tab group).");

const COMPUTER_ACTIONS = [
  "screenshot",
  "left_click",
  "right_click",
  "double_click",
  "triple_click",
  "hover",
  "type",
  "key",
  "scroll",
  "scroll_to",
  "wait",
  "left_click_drag",
  "zoom",
];

/** name, description, and a ZodRawShape of arguments for each tool. */
const TOOLS = [
  [
    "tabs_context_mcp",
    "Context for the automation tab group. Call this first; returns the tabId.",
    {
      createIfEmpty: z
        .boolean()
        .optional()
        .describe("Create the automation tab/group if none exists."),
    },
  ],
  ["tabs_create_mcp", "Create a new tab in the automation tab group.", {}],
  [
    "navigate",
    "Load a URL, or 'back' / 'forward'.",
    {
      url: z.string().describe("A URL, or the literal 'back' / 'forward'."),
      tabId,
    },
  ],
  [
    "computer",
    "Multi-action browser control (screenshot, click, type, scroll, …).",
    {
      action: z.enum(COMPUTER_ACTIONS).describe("Which action to perform."),
      tabId,
      coordinate: z
        .array(z.number())
        .optional()
        .describe("[x, y] target, where the action needs one."),
      text: z.string().optional().describe("Text for 'type', or key chord for 'key'."),
      ref: z.string().optional().describe("Element ref (from find/read_page) to target."),
      scroll_direction: z.enum(["up", "down", "left", "right"]).optional(),
      scroll_amount: z.number().optional(),
      duration: z.number().optional().describe("Seconds, for 'wait'."),
    },
  ],
  [
    "read_page",
    "Accessibility tree with element refs.",
    {
      tabId,
      filter: z.string().optional().describe("e.g. 'link', 'button', 'input'."),
      depth: z.number().optional(),
      max_chars: z.number().optional(),
      ref_id: z.string().optional().describe("Expand a subtree from this ref."),
    },
  ],
  ["get_page_text", "Readable page text.", { tabId }],
  [
    "find",
    "Find elements; returns refs + coordinates.",
    {
      query: z.string().describe("What to look for, in natural language."),
      tabId,
    },
  ],
  [
    "form_input",
    "Set an input/select/checkbox by element ref.",
    {
      ref: z.string().describe("Element ref from find/read_page."),
      value: z.string().describe("Value to set."),
      tabId,
    },
  ],
  [
    "javascript_tool",
    "Evaluate JavaScript in the page.",
    {
      text: z.string().describe("JavaScript source to evaluate."),
      tabId,
    },
  ],
  [
    "read_console_messages",
    "Read captured console messages.",
    {
      tabId,
      pattern: z.string().optional(),
      limit: z.number().optional(),
      onlyErrors: z.boolean().optional(),
      clear: z.boolean().optional(),
    },
  ],
  [
    "read_network_requests",
    "Read captured network requests.",
    {
      tabId,
      urlPattern: z.string().optional(),
      limit: z.number().optional(),
      clear: z.boolean().optional(),
    },
  ],
  [
    "resize_window",
    "Resize the window for the tab.",
    {
      width: z.number(),
      height: z.number(),
      tabId,
    },
  ],
  [
    "upload_image",
    "Attach an image to a file input.",
    {
      imageId: z.string(),
      tabId,
      ref: z.string().optional(),
      coordinate: z.array(z.number()).optional(),
    },
  ],
  [
    "update_plan",
    "Echo a plan (auto-approved).",
    {
      domains: z.array(z.string()).describe("Domains the plan will touch."),
      approach: z.string().describe("Short description of the approach."),
    },
  ],
];

// ─── MCP server (stdio) ──────────────────────────────────────────────────────
const mcp = new McpServer({ name: "browser-operator", version: "0.1.0" });

for (const [name, description, shape] of TOOLS) {
  mcp.tool(name, description, shape, async (args) => {
    try {
      const result = await runCommand(name, args);
      return toMcpResult(result);
    } catch (err) {
      return { content: [{ type: "text", text: err.message }], isError: true };
    }
  });
}

await mcp.connect(new StdioServerTransport());
log(`MCP server ready (${TOOLS.length} tools). Token "${TOKEN}".`);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
