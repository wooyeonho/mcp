import assert from "node:assert/strict";
import { createHttpApp } from "../src/server.js";

let count = 0;
function check(name: string, condition: unknown) {
  assert.ok(condition, name);
  count += 1;
}

const app = createHttpApp();
const server = app.listen(0);
try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${baseUrl}/health`);
  check("health status", health.status === 200);
  const healthJson = await health.json() as { ok: boolean; version: string; tools: string[] };
  check("health ok", healthJson.ok === true);
  check("health version", typeof healthJson.version === "string");
  check("three tools", healthJson.tools.length === 3);
  check("fastest tool exposed", healthJson.tools.includes("get_fastest_route_action"));

  const options = await fetch(`${baseUrl}/mcp`, { method: "OPTIONS" });
  check("cors options status", options.status === 204);
  check("cors origin", options.headers.get("access-control-allow-origin") === "*");

  const badMcp = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  check("mcp requires session", badMcp.status === 400);

  console.log(`${count} protocol assertions passed`);
} finally {
  server.close();
}
