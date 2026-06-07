# Security Policy

Browser Operator is a browser-automation agent that drives a real Chromium browser
over the Chrome DevTools Protocol, so we take security seriously and appreciate
responsible disclosure.

## Supported versions

Security fixes are applied to the latest `main` and the most recent published
release. Always run a current version before reporting an issue.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report them privately through
[**GitHub Security Advisories**](https://github.com/cereon-labs/cereon-browser-operator/security/advisories/new)
("Report a vulnerability"). This keeps the details private until a fix is available.

Please include, where possible:

- The type of issue (e.g. auth/token bypass, command injection, escaping the
  automation tab group, sensitive data exposure)
- The affected tool, transport, or file(s)
- Steps to reproduce or a proof of concept
- The potential impact and any suggested remediation

We will acknowledge your report, investigate, and keep you updated. Please give us
a reasonable opportunity to release a fix before public disclosure. We're happy to
credit reporters who want acknowledgement.

## Security model & operator responsibilities

Browser Operator is **self-hosted and model-agnostic** — it is the "hands," not
the "brain." Some properties depend on how you run it:

- **Token auth.** The extension talks only to the backend URL you configure and
  authenticates with a bearer token. Use a strong, unique `OPERATOR_TOKEN` — never
  the `dev-token` default — in any non-local setup.
- **Automation tab group boundary.** The extension only acts inside its dedicated
  automation tab group; your everyday tabs are off-limits. Don't disable or work
  around this boundary.
- **Prompt injection is inherent to browser agents.** A malicious page can try to
  hijack any LLM driving the browser. You control the model, system prompt, and
  allowed tools — keep a human in the loop for sensitive actions and treat
  untrusted pages with caution. See the FAQ in the [README](README.md).

## What we do on our side

CI runs **CodeQL** static analysis and a strict TypeScript build, with Dependabot
keeping dependencies current.
