# Contributing

Thanks for your interest! This is a vendor-neutral browser-automation agent — the
core is a stable [protocol](PROTOCOL.md) and a CDP engine; backends are pluggable.
We're building the **open-source, self-hosted alternative to closed browser agents**
like Claude for Chrome, and contributions of every size are welcome — new tools,
transports, auth modes, docs, examples, and bug reports.

**Good first contributions:** add a tool, a `computer` action, a transport, or an
auth mode using the existing extension points (see [Extending](#extending) below) —
each is self-contained. Docs and example backends in other languages are just as
valuable. Found a bug or have an idea?
[Open an issue](https://github.com/cereon-labs/cereon-browser-operator/issues), and
a ⭐ helps others discover the project.

## Setup

This is a single **pnpm workspace** (Node.js 22+). One install at the repo root
covers the extension, the [MCP server](mcp-server/), and the
[reference backend](examples/) — there are no per-directory installs and one
`pnpm-lock.yaml`.

```bash
pnpm install
pnpm build      # bundles src/ -> dist/ (load unpacked in chrome://extensions)
```

## Gates (run before opening a PR)

```bash
pnpm format        # prettier --write (or pnpm format:check to verify only)
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Or run them all at once with **`pnpm check`** (`format:check` → `lint` →
`typecheck` → `test` → `build`). Every gate must pass — the
[CI workflow](.github/workflows/ci.yml) runs the exact same sequence on Node 22
and 24, plus a build-output check and a CodeQL security scan.

## Reporting bugs & security issues

- **Bugs / features:** open an issue — the repo ships
  [issue forms](.github/ISSUE_TEMPLATE/) for both. PRs use the
  [pull-request template](.github/PULL_REQUEST_TEMPLATE.md) (a checklist tied to
  the gates above).
- **Security vulnerabilities:** please **don't** open a public issue — report
  them privately via
  [GitHub Security advisories](https://github.com/cereon-labs/cereon-browser-operator/security/advisories/new).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) — e.g.
`feat: add scroll-by-selector action`, `fix: …`, `docs: …`, `chore: …`. It keeps
history readable and lets release notes be generated automatically.

## Where things live

```
src/
├── shared/      # protocol types, brand, errors, logger, constants, utils
├── config/      # ConnectionConfig + ConfigStore (runtime backend settings)
├── background/
│   ├── transport/   # Transport interface + SSE/HTTP + WebSocket + factory
│   ├── auth/        # AuthProvider + TokenAuth
│   ├── cdp/ input/ screenshot/ tabs/ content-bridge/
│   └── tools/       # one class per tool (Command); computer/ = action strategies
├── content/     # in-page DOM introspection (a11y tree, find, forms)
├── options/     # settings page controller
└── popup/       # status + connect/disconnect
examples/        # reference backend + CLI (implements PROTOCOL.md)
```

## Extending

- **A new tool:** add a `Tool` class under `src/background/tools/`, register it in
  `all-tools.ts`, and document it in `PROTOCOL.md`. Nothing else changes
  (Open/Closed via the registry).
- **A new `computer` action:** add a `ComputerAction` under
  `tools/computer/actions/` and register it in `computer-tool.ts`.
- **A new transport:** implement `Transport`, add an arm to
  `transport/factory.ts`, and document its framing in `PROTOCOL.md`.
- **A new auth mode:** implement `AuthProvider`, add an arm to `buildAuth`.

Keep pure logic free of `chrome.*` so it stays unit-testable (see `tests/`).

## Style

TypeScript strict mode; match the surrounding code's naming and comment density.
Prefer small single-responsibility classes over growing a switch.
