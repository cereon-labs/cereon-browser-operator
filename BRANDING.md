# Branding a fork

Browser Operator is MIT licensed and built to be re-skinned: fork it to **ship your
own branded, Claude-for-Chrome-style browser operator inside your product** — your
name, your colors, your icons, pointed at your backend. No code surgery required.

All UI strings the extension shows at runtime come from one file —
[`src/shared/brand.ts`](src/shared/brand.ts). Forking the look is editing that
file plus the two things a TypeScript constant can't reach (the manifest and the
icon files).

## Checklist

1. **`src/shared/brand.ts`** — product name, short name, tab-group title/color,
   home URL/label, and UI copy. The popup, options page, and automation tab group
   read from here.
2. **`static/manifest.json`** — `name` and `description` (static JSON; can't import
   the TS constant).
3. **`static/icons/`** — replace `icon16.png`, `icon48.png`, `icon128.png`.
4. **Colors** — the popup/options palette lives in the `<style>` blocks of
   `static/popup.html` and `static/options.html` (CSS variables at the top).

Then `pnpm build` and load `dist/`.

## Extension id

The committed manifest has **no `key`**, so each install/fork gets its own
extension id — which is exactly what you want for an independent project. Token
auth works regardless of the id, so there is nothing else to configure.
