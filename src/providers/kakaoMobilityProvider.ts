import type { GoodRouteRequest, GoodRouteSuggestion, RouteOption, RouteProvider, RouteRequest, WeatherContext } from "./types.js";
import { geocodePlace } from "./kakaoLocalProvider.js";
import { MockRouteProvider } from "./mockRouteProvider.js";

// Kakao Mobility API — car-routing endpoint (same KAKAO_REST_API_KEY as Local API)
const KAKAO_NAVI_BASE = "https://apis-navi.kakaomobility.com/v1";

interface KakaoNaviSummary {
  duration: number;   // seconds
  distance: number;   // meters
  fare: { taxi: number; toll: number };
}

interface KakaoNaviResponse {
  routes: Array<{ summary: KakaoNaviSummary }>;
}

export class KakaoMobilityProvider implements RouteProvider {
  private readonly mock = new MockRouteProvider();

  constructor(private readonly kakaoKey?: string) {}

  async getRouteOptions(req: RouteRequest): Promise<RouteOption[]> {
    // Get mock options first (subway + bus)
    const mockOptions = await this.mock.getRouteOptions(req);

    if (!this.kakaoKey) return mockOptions;

    // Replace mock taxi with real Kakao Mobility data
    try {
      const [oCoords, dCoords] = await Promise.all([
        geocodePlace(req.origin, this.kakaoKey),
        geocodePlace(req.destination, this.kakaoKey),
      ]);

      if (!oCoords || !dCoords) return mockOptions;

      const url =
        `${KAKAO_NAVI_BASE}/directions` +
        `?origin=${oCoords.lng},${oCoords.lat}` +
        `&destination=${dCoords.lng},${dCoords.lat}` +
        `&priority=RECOMMEND`;

      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${this.kakaoKey}` },
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) return mockOptions;

      const data = (await res.json()) as KakaoNaviResponse;
      const summary = data.routes?.[0]?.summary;
      if (!summary) return mockOptions;

      const taxiMinutes = Math.round(summary.duration / 60);
      const taxiFare = summary.fare.taxi || this.estimateFare(summary.distance / 1000);

      const realTaxi: RouteOption = {
        mode: "taxi",
        durationMinutes: taxiMinutes,
        boardAt: req.origin,
        alightAt: req.destination,
        firstWalkMinutes: 1,
        lastWalkMinutes: 1,
        crossingsToStop: 0,
        crossingsFromStop: 0,
        taxiFareKrw: taxiFare,
        missedFallback: "택시가 안 잡히면 카카오T 호출하세요.",
        destCoords: dCoords,
      };

      // Attach destCoords to other options too (for deep links)
      const enriched = mockOptions
        .filter((o) => o.mode !== "taxi")
        .map((o) => ({ ...o, destCoords: dCoords }));

      return applyWeather([...enriched, realTaxi], req.weather);
    } catch {
      return mockOptions;
    }
  }

  async getGoodRoute(req: GoodRouteRequest): Promise<GoodRouteSuggestion> {
    return this.mock.getGoodRoute(req);
  }

  private estimateFare(km: number): number {
    // 서울 택시 기본요금 4,800원 + ~1,000원/km
    const fare = 4800 + Math.max(0, km - 1.6) * 1000;
    return Math.round(fare / 100) * 100;
  }
}

function applyWeather(options: RouteOption[], weather?: WeatherContext): RouteOption[] {
  if (!weather || weather === "clear") return options;
  if (weather === "rain") {
    return options.map((o) =>
      o.mode === "taxi"
        ? { ...o, missedFallback: "비 오는 날은 택시 대기가 길어집니다. 5분 안에 안 잡히면 지하철로 전환하세요." }
        : { ...o, firstWalkMinutes: o.firstWalkMinutes + 2 },
    );
  }
  if (weather === "snow") {
    return options.map((o) =>
      o.mode === "taxi"
        ? { ...o, durationMinutes: o.durationMinutes + 10, missedFallback: "눈 오는 날은 지하철이 더 확실합니다." }
        : { ...o, firstWalkMinutes: o.firstWalkMinutes + 3 },
    );
  }
  return options;
}
