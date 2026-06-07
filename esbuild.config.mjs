// Build script for the Browser Operator extension.
//
// Bundles four independent entry points (service worker, content script, popup,
// options page) into self-contained IIFE files under dist/, then copies the
// static assets (manifest, html, icons). Bundling is what lets the source be
// split into ES modules while still satisfying MV3's "one classic script per
// context" rule.
//
// The backend is configured at runtime in the Options page — nothing about a
// specific server is baked in. Each install gets its own extension id, which is
// exactly what an independent, token-authenticated tool wants.
//
// Load unpacked from ./dist after building.

import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(root, "dist");
const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const baseOptions = {
  bundle: true,
  format: "iife",
  target: "es2022",
  platform: "browser",
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  legalComments: "none",
  logLevel: "info",
  entryPoints: {
    background: resolve(root, "src/background/index.ts"),
    content: resolve(root, "src/content/index.ts"),
    popup: resolve(root, "src/popup/popup.ts"),
    options: resolve(root, "src/options/options.ts"),
  },
  outdir,
};

function copyStatic() {
  cpSync(resolve(root, "static"), outdir, { recursive: true });
}

async function run() {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });

  if (watch) {
    const ctx = await esbuild.context(baseOptions);
    await ctx.watch();
    copyStatic();
    console.log(`[build] watching — output: ${outdir}`);
  } else {
    await esbuild.build(baseOptions);
    copyStatic();
    console.log(`[build] done — output: ${outdir}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
