# Use cases & recipes

Browser Operator is the **browser-control layer**. These recipes show what you can
build on top of it — including how to **wire any LLM into an agent loop** so you get a
Claude-for-Chrome-style experience on a model and stack you own.

> **Just want it working in an MCP client?** Use the bundled
> **[MCP server](../mcp-server/)** — no code. These recipes are for when you want to
> drive it yourself from a script or your own agent loop.

Every recipe assumes the reference backend is running and the extension is connected
(see [examples/README.md](../examples/README.md)). The backend exposes one driver
call the recipes use:

```
POST http://localhost:8787/commands   { "tool": "<name>", "args": { … } }
→ { "content": [ … ] }                # the tool result, or { "error": "…" }
```

Tool names and arguments are the protocol surface in [PROTOCOL.md](../PROTOCOL.md).

---

## Recipe 1 — Wire any LLM into a browser agent (~30 lines)

This is the honest "build your own Claude for Chrome" recipe. The **model is the
brain**; Browser Operator is the **hands**. The loop: show the model the page, let it
pick a tool, run it, feed the result back, repeat. Swap the model by swapping the
`callModel` function — nothing else changes.

```js
// agent.mjs — point ANY LLM at the browser via the reference server.
const OP = "http://localhost:8787/commands";
const TOKEN = process.env.OPERATOR_TOKEN ?? "dev-token";

// Run one Browser Operator tool, return its result.
async function tool(name, args) {
  const res = await fetch(OP, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ tool: name, args }),
  });
  return res.json(); // { content: [...] } or { error }
}

// Your LLM call. Return e.g. { tool, args } or { done: true }.
// Use Claude, GPT, Gemini, or a LOCAL model (Ollama / LM Studio) here.
async function callModel(goal, observation) {
  /* prompt your model with `goal` + `observation` (the page) and the tool
     catalog from PROTOCOL.md; parse its choice of the next tool to run. */
}

async function run(goal) {
  const { tabId } = JSON.parse(
    (await tool("tabs_context_mcp", { createIfEmpty: true })).content[0].text,
  );
  let observation = "(new tab)";
  for (let step = 0; step < 20; step++) {
    const decision = await callModel(goal, observation);
    if (decision.done) return console.log("✅", decision.summary);
    const result = await tool(decision.tool, { ...decision.args, tabId });
    observation = JSON.stringify(result.content);
  }
}

run("Find the price on example.com and report it.");
```

Give the model the **accessibility tree** (`read_page`) or **page text**
(`get_page_text`) as its observation, plus the [tool catalog](../PROTOCOL.md#tool-catalog)
as its action space. For a local, fully-private agent, set `callModel` to hit an
Ollama or LM Studio endpoint — no data leaves your machine.

---

## Recipe 2 — Build-test-verify for a coding agent

Pair Browser Operator with a coding agent (e.g. [Claude Code](https://www.claudecode.com)):
build in the terminal, then drive the browser to verify the change actually works and
read the errors when it doesn't.

```bash
node cli-driver.mjs navigate '{"url":"http://localhost:3000","tabId":123}'
node cli-driver.mjs read_console_messages '{"tabId":123,"onlyErrors":true}'
node cli-driver.mjs read_network_requests '{"tabId":123,"limit":20}'
node cli-driver.mjs computer '{"action":"screenshot","tabId":123}'
```

The agent reads console errors, failed network requests, and a screenshot, then loops
back to fix the code — a real build → test → verify cycle, all local.

---

## Recipe 3 — Scrape / extract structured data

Render the page, then pull a clean view for parsing — no brittle HTML scraping.

```bash
node cli-driver.mjs navigate      '{"url":"https://news.ycombinator.com","tabId":123}'
node cli-driver.mjs get_page_text '{"tabId":123}'                  # readable text
node cli-driver.mjs read_page     '{"tabId":123,"filter":"link"}'  # a11y tree w/ refs
node cli-driver.mjs find          '{"query":"comments link","tabId":123}'
```

Feed `get_page_text` / `read_page` output to an LLM (or a regex) to produce JSON. Works
on JS-heavy sites because the page is fully rendered before you read it.

---

## Recipe 4 — Form automation / RPA

Automate repetitive form workflows deterministically (no LLM needed) or under an
agent's control.

```bash
node cli-driver.mjs find        '{"query":"email field","tabId":123}'   # returns a ref
node cli-driver.mjs form_input  '{"ref":"e12","value":"jane@example.com","tabId":123}'
node cli-driver.mjs computer    '{"action":"left_click","tabId":123,"ref":"submit"}'
```

`find` returns element refs + coordinates; `form_input` sets inputs/selects/checkboxes;
`computer` handles clicks, typing, scrolling, and 10 more actions.

---

## Recipe 5 — Drive it from your own product (any language)

Anything that can serve an SSE stream (or open a WebSocket) and accept a result POST
can drive the browser. The reference server is ~150 lines
([examples/reference-server.mjs](../examples/reference-server.mjs)) and shows the whole
contract; implement the same shapes in Go, Python, Rust, or your own product. Issue
per-user tokens and scope each connection with a `target` if you need multi-tenant
isolation — the extension only needs the resulting token.

---

See the [protocol](../PROTOCOL.md) for the full tool catalog and message shapes, and
[comparison.md](comparison.md) for how this approach differs from bundled agents like
Claude for Chrome.
