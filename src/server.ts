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
  const mcp = new McpServer({ name: "오늘길 OneulGil", version: "0.2.0" });
  const routeProvider = new MockRouteProvider();
  const placeProvider = new MockPlaceProvider();

  mcp.tool(
    "save_user_places",
    "집, 회사, 자주 가는 장소를 저장합니다. 사용자가 '집은 ~', '회사는 ~' 등으로 장소를 알려줄 때 호출하세요.",
    saveUserPlacesSchema,
    async (input) => text(await saveUserPlaces(input)),
  );
  mcp.tool(
    "get_fastest_route_action",
    "가장 빠른 이동 행동을 알려줍니다. '퇴근', '출근', 'OO 빨리', '약속 늦었어', 'OO까지 몇 시까지' 같은 빠른 이동 질의에 사용하세요. 비 오는 날, 긴급 상황도 처리합니다.",
    fastestSchema,
    async (input) => text(await getFastestRouteAction(input, routeProvider)),
  );
  mcp.tool(
    "get_good_route",
    "기분 좋은 경로를 추천합니다. '퇴근 낭만', '카페 들렀다 가자', '산책', '혼밥', '약속 전에 밥' 같은 여유 있는 이동에 사용하세요.",
    goodRouteSchema,
    async (input) => text(await getGoodRoute(input, routeProvider, placeProvider)),
  );
  return mcp;
}

export function createHttpApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // CORS for PlayMCP and other MCP clients
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Accept");
    res.header("Access-Control-Expose-Headers", "mcp-session-id");
    if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });

  app.get("/health", (_req, res) => res.json({
    ok: true,
    service: "oneulgil-mcp",
    version: "0.2.0",
    tools: ["save_user_places", "get_fastest_route_action", "get_good_route"],
    features: ["weather_context", "urgency_detection", "recent_destination", "fixture_routing"],
  }));

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
      if (!transport) { res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: no valid session. Send an initialize request first." }, id: null }); return; }
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
