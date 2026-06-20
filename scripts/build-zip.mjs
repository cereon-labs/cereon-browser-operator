// Build, verify, and package the unpacked extension into a load-ready zip.
//
// Mirrors the CI release step (.github/workflows/release.yml) so the exact same
// artifact can be produced locally. Cross-platform: uses the `zip` CLI when
// available (Linux/macOS/CI) and falls back to .NET compression via PowerShell
// on Windows. Either path writes spec-compliant forward-slash entry names with
// manifest.json at the archive root, which is what Chrome's loader and the Web
// Store expect.
//
//   node scripts/build-zip.mjs              -> browser-operator-v<version>.zip
//   node scripts/build-zip.mjs cereon       -> browser-operator-cereon.zip
//   node scripts/build-zip.mjs --skip-build  (package the existing dist/ as-is)

import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const label = args.find((a) => !a.startsWith("--")); // optional filename label

function runNode(scriptRelPath, name) {
  const res = spawnSync(process.execPath, [resolve(root, scriptRelPath)], {
    stdio: "inherit",
    cwd: root,
  });
  if (res.status !== 0) {
    console.error(`✗ ${name} failed.`);
    process.exit(res.status ?? 1);
  }
}

// 1. Build (unless reusing the current dist/).
if (!skipBuild) runNode("esbuild.config.mjs", "build");

// 2. Verify the unpacked output is loadable before we ship it.
runNode("scripts/verify-dist.mjs", "verify-dist");

// 3. Name the artifact from the shipped manifest version (or the given label).
const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.json"), "utf8"));
const outName = `browser-operator-${label ?? `v${manifest.version}`}.zip`;
const outPath = resolve(root, outName);
rmSync(outPath, { force: true });

// 4. Package dist/ contents (manifest.json at the root) cross-platform.
function hasZipCli() {
  return spawnSync("zip", ["-v"], { stdio: "ignore" }).status === 0;
}

let zipped;
if (hasZipCli()) {
  zipped =
    spawnSync("zip", ["-r", "-q", outPath, "."], {
      cwd: dist,
      stdio: "inherit",
    }).status === 0;
} else if (process.platform === "win32") {
  // .NET ZipFile via PowerShell, forcing forward-slash entry names so the
  // archive is spec-compliant (Windows PowerShell's Compress-Archive is not).
  const ps = [
    "$ErrorActionPreference='Stop'",
    "Add-Type -AssemblyName System.IO.Compression",
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    `$src='${dist.replace(/'/g, "''")}'`,
    `$dest='${outPath.replace(/'/g, "''")}'`,
    "$zip=[System.IO.Compression.ZipFile]::Open($dest,[System.IO.Compression.ZipArchiveMode]::Create)",
    "try{Get-ChildItem -LiteralPath $src -Recurse -File|ForEach-Object{" +
      "$name=$_.FullName.Substring($src.Length+1).Replace('\\','/');" +
      "[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$_.FullName,$name,[System.IO.Compression.CompressionLevel]::Optimal)|Out-Null}}" +
      "finally{$zip.Dispose()}",
  ].join(";");
  zipped =
    spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      stdio: "inherit",
    }).status === 0;
} else {
  console.error(
    "✗ No `zip` CLI found. Install it (e.g. `apt install zip` / `brew install zip`).",
  );
  process.exit(1);
}

if (!zipped) {
  console.error("✗ Packaging failed.");
  process.exit(1);
}

console.log(`✓ Packaged ${outName} (load-unpacked / Web-Store ready) from dist/.`);
