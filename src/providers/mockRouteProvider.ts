import type { GoodRouteRequest, GoodRouteSuggestion, RouteOption, RouteProvider, RouteRequest } from "./types.js";

export class MockRouteProvider implements RouteProvider {
  async getRouteOptions(req: RouteRequest): Promise<RouteOption[]> {
    const subway: RouteOption = { mode: "subway", durationMinutes: 38, line: "2호선", direction: `${req.destination} 방면`, boardAt: req.origin.includes("강남") ? "강남역" : `${req.origin} 인근역`, alightAt: req.destination.includes("신림") ? "신림역" : `${req.destination} 인근역`, firstWalkMinutes: 5, lastWalkMinutes: 6, crossingsToStop: 1, crossingsFromStop: 1, fareKrw: 1550, missedFallback: "이번 열차를 놓치면 다음 열차 기준 약 4~6분 더 걸립니다." };
    const bus: RouteOption = { mode: "bus", durationMinutes: 47, busNumber: "146번", boardAt: `${req.origin} 정류장`, alightAt: `${req.destination} 정류장`, firstWalkMinutes: 4, lastWalkMinutes: 7, crossingsToStop: 2, crossingsFromStop: 1, fareKrw: 1500, missedFallback: "146번을 놓치면 같은 정류장에서 다음 버스를 기다리세요." };
    const taxi: RouteOption = { mode: "taxi", durationMinutes: 32, boardAt: req.origin, alightAt: req.destination, firstWalkMinutes: 1, lastWalkMinutes: 1, crossingsToStop: 0, crossingsFromStop: 0, taxiFareKrw: 18000, missedFallback: "택시가 바로 안 잡히면 지하철로 전환하세요." };
    return req.includeTaxi === false ? [subway, bus] : [subway, bus, taxi];
  }

  async getGoodRoute(req: GoodRouteRequest): Promise<GoodRouteSuggestion> {
    const extra = req.maxExtraMinutes ?? 20;
    const isCafe = !req.placeType || req.placeType === "cafe" || req.mood === "romantic";
    return {
      concept: isCafe ? "바로 집 가지 말고 조용한 카페를 한 번 들르는 길" : "차도 적은 골목으로 짧게 돌아 걷는 길",
      stopBy: isCafe ? "강남역 뒤편 조용한 카페 → 2호선 → 신림역" : "역까지 한 블록 우회 산책 → 2호선 → 집",
      detour: isCafe ? "집 가는 방향에서 약 6분만 우회" : "큰길보다 조용한 길 위주로 약 10분 우회",
      extraMinutesRange: [Math.max(8, extra - 2), extra + 2],
      reason: req.mood === "romantic" ? "퇴근 피로를 줄이고 대화하기 좋은 분위기라서요." : "무리하지 않고 기분만 바꾸기 좋습니다.",
      finalAction: isCafe ? "오늘은 카페 하나 들렀다가 지하철 타는 코스가 가장 무난합니다." : "오늘은 한 정거장 전부터 천천히 걷는 코스가 좋습니다."
    };
  }
}
