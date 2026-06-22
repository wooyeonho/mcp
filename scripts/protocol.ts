import assert from "node:assert/strict";
import { createHttpApp } from "../src/server.js";

let count = 0;
function check(name: string, condition: unknown) {
  assert.ok(condition, name);
  count += 1;
}
function parseSseJson(text: string) {
  const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
  assert.ok(dataLine, `SSE data line missing: ${text}`);
  return JSON.parse(dataLine.slice("data: ".length));
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

  const initialize = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 10, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "oneulgil-protocol-test", version: "0.0.0" } } })
  });
  check("mcp initialize status", initialize.status === 200);
  const sessionId = initialize.headers.get("mcp-session-id");
  check("mcp session header", Boolean(sessionId));
  const initialized = parseSseJson(await initialize.text());
  check("mcp initialize result", initialized.result.serverInfo.name.includes("오늘길"));

  const notify = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": sessionId! },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })
  });
  check("mcp initialized notification", notify.status === 202);

  const toolsList = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": sessionId! },
    body: JSON.stringify({ jsonrpc: "2.0", id: 11, method: "tools/list", params: {} })
  });
  check("mcp tools/list status", toolsList.status === 200);
  const toolsListJson = parseSseJson(await toolsList.text());
  check("mcp tools/list count", toolsListJson.result.tools.length === 3);
  check("mcp tools/list fastest", toolsListJson.result.tools.some((tool: { name: string }) => tool.name === "get_fastest_route_action"));

  const saveCall = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": sessionId! },
    body: JSON.stringify({ jsonrpc: "2.0", id: 12, method: "tools/call", params: { name: "save_user_places", arguments: { home: "신림역 근처", work: "강남역 근처" } } })
  });
  check("mcp tool call status", saveCall.status === 200);
  const saveCallJson = parseSseJson(await saveCall.text());
  check("mcp save tool content", saveCallJson.result.content[0].text.includes("저장했습니다"));

  const fastestCall = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": sessionId! },
    body: JSON.stringify({ jsonrpc: "2.0", id: 13, method: "tools/call", params: { name: "get_fastest_route_action", arguments: { query: "퇴근" } } })
  });
  check("mcp fastest call status", fastestCall.status === 200);
  const fastestCallJson = parseSseJson(await fastestCall.text());
  check("mcp fastest Korean response", fastestCallJson.result.content[0].text.includes("결론"));
  check("mcp fastest crossing response", fastestCallJson.result.content[0].text.includes("횡단보도"));

  console.log(`${count} protocol assertions passed`);
} finally {
  server.close();
}
