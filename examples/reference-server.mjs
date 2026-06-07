// Reference Browser Operator backend.
//
// The canonical implementation of PROTOCOL.md. It speaks BOTH transports on one
// port so you can try either:
//   - SSE/HTTP: GET /browser/events (stream), POST /browser/result
//   - WebSocket: ws://<host>/  (auth → command/result frames)
// and exposes a driver API the CLI uses to inject commands:
//   - POST /commands  { tool, args }  ->  waits for and returns the tool result
//
// Auth: a single bearer token (env OPERATOR_TOKEN, default "dev-token").
//
//   npm install && OPERATOR_TOKEN=dev-token node reference-server.mjs
//
// Then in the extension Options: WebSocket ws://localhost:8787 (or SSE/HTTP
// http://localhost:8787 with paths /browser/events and /browser/result), token
// auth, token "dev-token".

import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.OPERATOR_TOKEN ?? "dev-token";
const COMMAND_TIMEOUT_MS = 30_000;

/** commandId -> { resolve, timer } for in-flight commands awaiting a result. */
const pending = new Map();
/** The currently connected extension sink (SSE response or WS socket). */
let sink = null;

function bearer(req) {
  const header = req.headers["authorization"] ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function deliver(command) {
  if (!sink) throw new Error("No extension connected.");
  if (sink.kind === "sse") {
    sink.res.write(`data: ${JSON.stringify(command)}\n\n`);
  } else {
    sink.ws.send(JSON.stringify({ type: "command", ...command }));
  }
}

function enqueueCommand(tool, args) {
  const id = randomUUID();
  const command = { id, tool, args: args ?? {} };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Timed out waiting for the extension to return a result."));
    }, COMMAND_TIMEOUT_MS);
    pending.set(id, { resolve, timer });
    try {
      deliver(command);
    } catch (err) {
      clearTimeout(timer);
      pending.delete(id);
      reject(err);
    }
  });
}

function resolveResult({ commandId, result, error }) {
  const entry = pending.get(commandId);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(commandId);
  entry.resolve(error ? { error } : result);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}

// ─── HTTP: SSE stream, result POST, and the driver API ───────────────────────
const server = http.createServer(async (req, res) => {
  if (bearer(req) !== TOKEN) {
    res.writeHead(401).end("unauthorized");
    return;
  }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/browser/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    sink = { kind: "sse", res };
    console.log("[sse] extension connected");
    req.on("close", () => {
      if (sink?.res === res) sink = null;
      console.log("[sse] extension disconnected");
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/browser/result") {
    resolveResult(await readJson(req));
    res.writeHead(204).end();
    return;
  }

  if (req.method === "POST" && url.pathname === "/commands") {
    try {
      const { tool, args } = await readJson(req);
      const result = await enqueueCommand(tool, args);
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
    } catch (err) {
      res
        .writeHead(502, { "Content-Type": "application/json" })
        .end(JSON.stringify({ error: String(err.message) }));
    }
    return;
  }

  res.writeHead(404).end("not found");
});

// ─── WebSocket transport on the same port ────────────────────────────────────
const wss = new WebSocketServer({ server });
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
        sink = { kind: "ws", ws };
        ws.send(JSON.stringify({ type: "auth_ok" }));
        console.log("[ws] extension connected");
      } else {
        ws.close(4001, "auth rejected");
      }
      return;
    }
    if (frame.type === "result") resolveResult(frame);
  });
  ws.on("close", () => {
    if (sink?.ws === ws) sink = null;
    console.log("[ws] extension disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Browser Operator reference server on :${PORT} (token "${TOKEN}")`);
  console.log(`  SSE/HTTP  -> http://localhost:${PORT}  (/browser/events, /browser/result)`);
  console.log(`  WebSocket -> ws://localhost:${PORT}`);
  console.log(`  Driver    -> POST http://localhost:${PORT}/commands  { tool, args }`);
});
