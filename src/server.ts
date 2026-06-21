import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { MockPlaceProvider } from "./providers/mockPlaceProvider.js";
import { MockRouteProvider } from "./providers/mockRouteProvider.js";
import { fastestSchema, getFastestRouteAction } from "./tools/getFastestRouteAction.js";
import { getGoodRoute, goodRouteSchema } from "./tools/getGoodRoute.js";
import { saveUserPlaces, saveUserPlacesSchema } from "./tools/saveUserPlaces.js";

function text(content: string) { return { content: [{ type: "text" as const, text: content }] }; }

export function createMcpServer() {
  const mcp = new McpServer({ name: "오늘길 OneulGil", version: "0.1.0" });
  const routeProvider = new MockRouteProvider();
  const placeProvider = new MockPlaceProvider();

  mcp.tool("save_user_places", "집, 회사, 자주 가는 장소를 저장합니다.", saveUserPlacesSchema, async (input) => text(await saveUserPlaces(input)));
  mcp.tool("get_fastest_route_action", "가장 빠른 행동 경로, 도착 시각, 늦음 회복, 대중교통/택시 비교가 필요할 때 사용합니다.", fastestSchema, async (input) => text(await getFastestRouteAction(input, routeProvider)));
  mcp.tool("get_good_route", "낭만, 카페, 산책, 혼밥, 분위기, 돌아가는 길 등 기분 좋은 경로가 필요할 때 사용합니다.", goodRouteSchema, async (input) => text(await getGoodRoute(input, routeProvider, placeProvider)));
  return mcp;
}

export function createHttpApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => res.json({ ok: true, service: "oneulgil-mcp", tools: ["save_user_places", "get_fastest_route_action", "get_good_route"] }));

  const transports: Record<string, StreamableHTTPServerTransport> = {};
  app.post("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport = sessionId ? transports[sessionId] : undefined;
      if (!transport && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), onsessioninitialized: (id) => { transports[id] = transport!; } });
        transport.onclose = () => { if (transport?.sessionId) delete transports[transport.sessionId]; };
        await createMcpServer().connect(transport);
      }
      if (!transport) { res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: no valid session" }, id: null }); return; }
      await transport.handleRequest(req, res, req.body);
    } catch (error) { console.error("mcp_http_error", error instanceof Error ? error.message : "unknown"); if (!res.headersSent) res.status(500).json({ error: "internal server error" }); }
  });
  const handleSession = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId ? transports[sessionId] : undefined;
    if (!transport) { res.status(400).send("Invalid or missing session id"); return; }
    await transport.handleRequest(req, res);
  };
  app.get("/mcp", handleSession);
  app.delete("/mcp", handleSession);
  return app;
}
