// Minimal CLI to drive the extension through the reference server.
//
//   node cli-driver.mjs <tool> '<json-args>'
//
// Examples:
//   node cli-driver.mjs tabs_context_mcp '{"createIfEmpty":true}'
//   node cli-driver.mjs navigate '{"url":"example.com","tabId":123}'
//   node cli-driver.mjs computer '{"action":"screenshot","tabId":123}'
//
// Tool names are the protocol tool names (see PROTOCOL.md). Requires the
// reference server to be running and the extension connected.

const BASE = process.env.OPERATOR_URL ?? "http://localhost:8787";
const TOKEN = process.env.OPERATOR_TOKEN ?? "dev-token";

const [tool, argsJson = "{}"] = process.argv.slice(2);
if (!tool) {
  console.error("usage: node cli-driver.mjs <tool> '<json-args>'");
  process.exit(1);
}

let args;
try {
  args = JSON.parse(argsJson);
} catch (err) {
  console.error(`invalid JSON args: ${err.message}`);
  process.exit(1);
}

const res = await fetch(`${BASE}/commands`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({ tool, args }),
});

const body = await res.json();
console.log(JSON.stringify(body, null, 2));
process.exit(res.ok ? 0 : 1);
