// Sanity-check that `pnpm build` produced a loadable unpacked extension.
//
// Run after a build (CI does this); exits non-zero with a clear message if any
// required artifact is missing or the manifest isn't a valid MV3 document.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");

const required = [
  "background.js",
  "content.js",
  "popup.js",
  "options.js",
  "popup.html",
  "options.html",
  "manifest.json",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

const missing = required.filter((file) => !existsSync(resolve(dist, file)));
if (missing.length > 0) {
  console.error(`✗ Missing build artifacts in dist/:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(resolve(dist, "manifest.json"), "utf8"));
} catch (err) {
  console.error(`✗ dist/manifest.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  console.error(`✗ manifest_version is ${manifest.manifest_version}; expected 3.`);
  process.exit(1);
}

console.log(
  `✓ dist/ looks good — ${manifest.name} v${manifest.version} ` +
    `(MV${manifest.manifest_version}); ${required.length} artifacts present.`,
);
