import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { KakaoLocalProvider } from "./providers/kakaoLocalProvider.js";
import { KakaoMobilityProvider } from "./providers/kakaoMobilityProvider.js";
import { fetchSeoulWeather } from "./providers/weatherProvider.js";
import { fastestSchema, getFastestRouteAction } from "./tools/getFastestRouteAction.js";
import { getGoodRoute, goodRouteSchema } from "./tools/getGoodRoute.js";
import { saveUserPlaces, saveUserPlacesSchema } from "./tools/saveUserPlaces.js";

function text(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

// Providers are singletons — re-use across sessions
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
const routeProvider = new KakaoMobilityProvider(KAKAO_KEY);
const placeProvider = new KakaoLocalProvider(KAKAO_KEY);

export function createMcpServer(userId: string) {
  const mcp = new McpServer({ name: "오늘길 OneulGil", version: "0.3.0" });

  mcp.tool(
    "save_user_places",
    "집, 회사, 자주 가는 장소를 저장합니다. 사용자가 '집은 ~', '회사는 ~' 등으로 장소를 알려줄 때 호출하세요.",
    saveUserPlacesSchema,
    async (input) => text(await saveUserPlaces(input, userId)),
  );

  mcp.tool(
    "get_fastest_route_action",
    "가장 빠른 이동 행동을 알려줍니다. '퇴근', '출근', 'OO 빨리', '약속 늦었어', 'OO까지 몇 시까지' 같은 빠른 이동 질의에 사용하세요. 비 오는 날, 긴급 상황도 처리합니다.",
    fastestSchema,
    async (input) => text(await getFastestRouteAction(input, routeProvider, userId, fetchSeoulWeather)),
  );

  mcp.tool(
    "get_good_route",
    "기분 좋은 경로를 추천합니다. '퇴근 낭만', '카페 들렀다 가자', '산책', '혼밥', '약속 전에 밥' 같은 여유 있는 이동에 사용하세요.",
    goodRouteSchema,
    async (input) => text(await getGoodRoute(input, routeProvider, placeProvider, userId, fetchSeoulWeather)),
  );

  return mcp;
}

const SESSION_TTL_MS = 30 * 60 * 1000;

export function createHttpApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // CORS for PlayMCP and web-based MCP clients
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, x-kakao-user-id, Accept");
    res.header("Access-Control-Expose-Headers", "mcp-session-id");
    if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });

  app.get("/health", (_req, res) =>
    res.json({
      ok: true,
      service: "oneulgil-mcp",
      version: "0.3.0",
      tools: ["save_user_places", "get_fastest_route_action", "get_good_route"],
      features: [
        "kakao_local_api",
        "kakao_mobility_api",
        "openmeteo_weather",
        "kakao_deeplinks",
        "urgency_detection",
        "recent_destination",
        "fixture_routing",
        "per_user_profile",
        "file_persistence",
        "crosswalk_time",
      ],
      kakao_api_connected: !!KAKAO_KEY,
    }),
  );

  const transports: Record<string, StreamableHTTPServerTransport> = {};
  const sessionTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  function touchSession(id: string) {
    if (sessionTimers[id]) clearTimeout(sessionTimers[id]);
    sessionTimers[id] = setTimeout(() => {
      const t = transports[id];
      if (t) { try { t.close?.(); } catch { /* ignore */ } }
      delete transports[id];
      delete sessionTimers[id];
    }, SESSION_TTL_MS);
  }

  app.post("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport = sessionId ? transports[sessionId] : undefined;

      if (!transport && isInitializeRequest(req.body)) {
        // x-kakao-user-id header gives stable identity across sessions (PlayMCP sends this)
        const stableUserId =
          (req.headers["x-kakao-user-id"] as string | undefined) ?? randomUUID();

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => stableUserId,
          onsessioninitialized: (id) => { transports[id] = transport!; touchSession(id); },
        });
        transport.onclose = () => {
          if (transport?.sessionId) {
            if (sessionTimers[transport.sessionId]) clearTimeout(sessionTimers[transport.sessionId]);
            delete transports[transport.sessionId];
            delete sessionTimers[transport.sessionId];
          }
        };
        await createMcpServer(stableUserId).connect(transport);
      }

      if (!transport) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: no valid session. Send an initialize request first." },
          id: null,
        });
        return;
      }
      if (sessionId) touchSession(sessionId);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("mcp_http_error", error instanceof Error ? error.message : "unknown");
      if (!res.headersSent) res.status(500).json({ error: "internal server error" });
    }
  });

  const handleSession = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId ? transports[sessionId] : undefined;
    if (!transport) { res.status(400).send("Invalid or missing session id"); return; }
    if (sessionId) touchSession(sessionId);
    await transport.handleRequest(req, res);
  };

  app.get("/mcp", handleSession);
  app.delete("/mcp", handleSession);
  return app;
}
