// One-command demo: build the extension, then boot the reference backend so you
// can load `dist/` unpacked and drive your real browser end-to-end.
//
//   pnpm demo
//
// Override the token with OPERATOR_TOKEN=… pnpm demo

import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.OPERATOR_TOKEN ?? "dev-token";

console.log("→ Building the extension (esbuild)…");
const build = spawnSync(process.execPath, ["esbuild.config.mjs"], {
  cwd: root,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

console.log(
  [
    "",
    "✓ Built dist/. Now, in your browser:",
    "  1. Open chrome://extensions and enable Developer mode.",
    "  2. Load unpacked → select the dist/ folder.",
    `  3. Popup → Configure…: WebSocket, ws://localhost:8787, token "${TOKEN}".`,
    "     Save, then Connect.",
    "",
    "Starting the reference backend on ws://localhost:8787 (Ctrl+C to stop)…",
    "",
  ].join("\n"),
);

const server = spawn(process.execPath, ["examples/reference-server.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, OPERATOR_TOKEN: TOKEN },
});

const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
