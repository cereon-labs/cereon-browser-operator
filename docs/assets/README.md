# docs/assets

Home for the screenshots, GIFs, and social-preview image referenced from the
project docs. Keep binaries small (compress GIFs/PNGs) — they ship in every clone.

## Wanted assets

| File                        | Used by                                                          | Notes                                                                                                                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo.gif`                  | `README.md` (top "Demo" block)                                   | The single biggest conversion lever. Record the full happy path: open **Configure…** → set WebSocket `ws://localhost:8787` + token → **Connect** → ask the agent to "open example.com and screenshot it" → show the screenshot coming back. ~10–20s, ≤ ~5 MB, ≥ 800px wide. |
| `social-preview.png`        | GitHub repo social preview (Settings → General → Social preview) | 1280×640. Product name + one-line pitch + logo.                                                                                                                                                                                                                             |
| `popup.png` / `options.png` | optional — README walkthrough                                    | Clean shots of the popup (Connected state) and the Configure page.                                                                                                                                                                                                          |

## How to record the demo GIF

1. `pnpm install && pnpm build`, then load `dist/` at `chrome://extensions`.
2. Start a backend — the bundled MCP server (`mcp-server/`) or the reference
   server (`examples/`). See each directory's README.
3. Record the screen (e.g. [Kap](https://getkap.co/), ScreenToGif, or
   `ffmpeg`/Peek on Linux) while you connect and run one command.
4. Compress (`gifsicle -O3 --lossy=80` or an online optimizer) and save here as
   `demo.gif`.
5. Uncomment the demo image line in `README.md` so it renders.

> Until `demo.gif` exists, the README keeps a commented-out placeholder so no
> broken image shows. Replace the placeholder, don't add a link to a missing file.
