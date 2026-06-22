import type { GoodRouteRequest, GoodRouteSuggestion, RouteOption, RouteProvider, RouteRequest, WeatherContext } from "./types.js";

interface RouteFixture {
  match: (origin: string, destination: string) => boolean;
  routes: (req: RouteRequest) => RouteOption[];
  good: (req: GoodRouteRequest) => GoodRouteSuggestion;
}

const fixtures: RouteFixture[] = [
  {
    match: (o, d) => o.includes("강남") && d.includes("신림"),
    routes: () => [
      { mode: "subway", durationMinutes: 38, line: "2호선", direction: "신림 방면", boardAt: "강남역", alightAt: "신림역", firstWalkMinutes: 5, lastWalkMinutes: 6, crossingsToStop: 1, crossingsFromStop: 1, fareKrw: 1550, missedFallback: "다음 열차 4~6분 뒤 출발합니다. 2호선 배차가 짧으니 걱정 마세요." },
      { mode: "bus", durationMinutes: 47, busNumber: "146번", boardAt: "강남역 정류장", alightAt: "신림역 정류장", firstWalkMinutes: 4, lastWalkMinutes: 7, crossingsToStop: 2, crossingsFromStop: 1, fareKrw: 1500, missedFallback: "146번을 놓치면 5008번으로 전환하세요. 배차 7분입니다." },
      { mode: "taxi", durationMinutes: 32, boardAt: "강남역 2번 출구", alightAt: "신림역", firstWalkMinutes: 1, lastWalkMinutes: 1, crossingsToStop: 0, crossingsFromStop: 0, taxiFareKrw: 18000, missedFallback: "택시가 안 잡히면 바로 지하철로 전환하세요." },
    ],
    good: (req) => {
      const isCafe = !req.placeType || req.placeType === "cafe" || req.mood === "romantic";
      const isWalk = req.placeType === "walk";
      if (isWalk) return { concept: "강남역에서 한 정거장 전부터 천천히 걸어보는 코스", stopBy: "서초 이면도로 → 남부순환 산책길 → 신림역", detour: "큰길 대신 골목길로 한 블록 우회", extraMinutesRange: [8, 14], reason: "뛰지 않고 천천히 걸으면 머리가 환기됩니다.", finalAction: "오늘은 이어폰 끼고 천천히 걸어가세요. 10분이면 기분이 바뀝니다." };
      if (isCafe) return { concept: "바로 집 가지 말고 조용한 카페를 한 번 들르는 길", stopBy: "강남역 뒤편 조용한 카페 → 2호선 → 신림역", detour: "집 가는 방향에서 약 6분만 우회", extraMinutesRange: [6, 10], reason: "퇴근 피로를 줄이고 대화하기 좋은 분위기라서요.", finalAction: "오늘은 카페 하나 들렀다가 지하철 타세요. 마음이 풀립니다." };
      return { concept: "덮밥 한 그릇 뚝딱하고 가는 길", stopBy: "강남역 지하상가 혼밥집 → 2호선 → 신림역", detour: "강남역에서 식사 후 바로 탑승", extraMinutesRange: [15, 22], reason: "빈속에 집 가면 또 배달 시킵니다. 역에서 해결하세요.", finalAction: "지하상가 덮밥집에서 10분이면 끝납니다. 먹고 타세요." };
    },
  },
  {
    match: (o, d) => o.includes("신림") && d.includes("강남"),
    routes: () => [
      { mode: "subway", durationMinutes: 36, line: "2호선", direction: "강남 방면", boardAt: "신림역", alightAt: "강남역", firstWalkMinutes: 4, lastWalkMinutes: 5, crossingsToStop: 1, crossingsFromStop: 2, fareKrw: 1550, missedFallback: "다음 열차 3~5분 뒤입니다. 출근 시간대 배차 짧습니다." },
      { mode: "bus", durationMinutes: 44, busNumber: "5008번", boardAt: "신림역 정류장", alightAt: "강남역 정류장", firstWalkMinutes: 3, lastWalkMinutes: 6, crossingsToStop: 1, crossingsFromStop: 1, fareKrw: 1500, missedFallback: "5008번 놓치면 146번 기다리세요. 같은 정류장입니다." },
      { mode: "taxi", durationMinutes: 28, boardAt: "신림역 3번 출구", alightAt: "강남역", firstWalkMinutes: 1, lastWalkMinutes: 1, crossingsToStop: 0, crossingsFromStop: 0, taxiFareKrw: 17000, missedFallback: "택시 대기 길면 지하철이 더 빠릅니다." },
    ],
    good: () => ({ concept: "출근길에 커피 한 잔 여유", stopBy: "신림역 인근 카페 → 2호선 → 강남역", detour: "역 근처 테이크아웃 카페 들렀다 바로 탑승", extraMinutesRange: [5, 8], reason: "빈속에 출근하면 오전 집중이 떨어집니다.", finalAction: "오늘은 커피 하나 들고 타세요. 5분이면 됩니다." }),
  },
  {
    match: (o, d) => o.includes("강남") && d.includes("홍대"),
    routes: () => [
      { mode: "subway", durationMinutes: 28, line: "2호선", direction: "홍대입구 방면", boardAt: "강남역", alightAt: "홍대입구역", firstWalkMinutes: 4, lastWalkMinutes: 3, crossingsToStop: 1, crossingsFromStop: 1, fareKrw: 1550, missedFallback: "2호선 내선순환 다음 열차 3분 뒤입니다." },
      { mode: "bus", durationMinutes: 42, busNumber: "472번", boardAt: "강남역 정류장", alightAt: "홍대입구 정류장", firstWalkMinutes: 5, lastWalkMinutes: 5, crossingsToStop: 2, crossingsFromStop: 1, fareKrw: 1500, missedFallback: "472번 놓치면 지하철로 전환하세요. 더 빠릅니다." },
      { mode: "taxi", durationMinutes: 22, boardAt: "강남역 5번 출구", alightAt: "홍대입구", firstWalkMinutes: 1, lastWalkMinutes: 1, crossingsToStop: 0, crossingsFromStop: 0, taxiFareKrw: 15000, missedFallback: "택시가 바로 안 잡히면 지하철 2호선이 확실합니다." },
    ],
    good: (req) => {
      if (req.placeType === "restaurant") return { concept: "약속 전에 혼밥 한 끼 해결하는 길", stopBy: "강남역 인근 혼밥집 → 2호선 → 홍대입구", detour: "강남에서 먹고 바로 지하철 탑승", extraMinutesRange: [12, 18], reason: "약속에서 배고프면 집중이 안 됩니다. 미리 한 끼 해결하세요.", finalAction: "역 지하상가 덮밥 10분이면 끝납니다. 먹고 출발하세요." };
      return { concept: "2호선 타고 가면서 합정 근처 카페 한 잔", stopBy: "강남역 → 2호선 → 합정 카페 → 홍대입구", detour: "한 정거장 전 하차 후 걸어가기", extraMinutesRange: [8, 12], reason: "홍대 도착 전에 분위기 전환 한 번 하면 좋습니다.", finalAction: "합정에서 내려서 걸어가세요. 거리 분위기가 좋습니다." };
    },
  },
  {
    match: (_o, d) => d.includes("병원") || d.includes("의료"),
    routes: (req) => [
      { mode: "subway", durationMinutes: 42, line: "2호선+환승", direction: `${req.destination} 방면`, boardAt: `${req.origin} 인근역`, alightAt: `${req.destination} 인근역`, firstWalkMinutes: 5, lastWalkMinutes: 8, crossingsToStop: 1, crossingsFromStop: 2, fareKrw: 1550, missedFallback: "다음 열차로 탑승하세요. 환승 포함 5분 지연됩니다." },
      { mode: "bus", durationMinutes: 50, busNumber: "간선버스", boardAt: `${req.origin} 정류장`, alightAt: `${req.destination} 정류장`, firstWalkMinutes: 4, lastWalkMinutes: 10, crossingsToStop: 1, crossingsFromStop: 2, fareKrw: 1500, missedFallback: "다음 버스 기다리거나 지하철로 전환하세요." },
      { mode: "taxi", durationMinutes: 30, boardAt: req.origin, alightAt: req.destination, firstWalkMinutes: 1, lastWalkMinutes: 1, crossingsToStop: 0, crossingsFromStop: 0, taxiFareKrw: 22000, missedFallback: "병원 예약 시간이 촉박하면 택시가 확실합니다." },
    ],
    good: () => ({ concept: "병원 전에 마음 정리하는 산책 코스", stopBy: "인근 공원 산책 → 병원", detour: "병원 근처 조용한 길로 우회", extraMinutesRange: [8, 12], reason: "병원 가기 전 마음이 급하면 대기 시간이 더 길게 느껴집니다.", finalAction: "10분 일찍 나와서 천천히 걸어가세요. 대기 시간에 마음이 편합니다." }),
  },
  {
    match: () => true,
    routes: (req) => [
      { mode: "subway", durationMinutes: 35, line: "지하철", direction: `${req.destination} 방면`, boardAt: `${req.origin} 인근역`, alightAt: `${req.destination} 인근역`, firstWalkMinutes: 5, lastWalkMinutes: 6, crossingsToStop: 1, crossingsFromStop: 1, fareKrw: 1550, missedFallback: "다음 열차 3~5분 뒤 출발합니다." },
      { mode: "bus", durationMinutes: 45, busNumber: "간선버스", boardAt: `${req.origin} 정류장`, alightAt: `${req.destination} 정류장`, firstWalkMinutes: 4, lastWalkMinutes: 7, crossingsToStop: 1, crossingsFromStop: 1, fareKrw: 1500, missedFallback: "다음 버스를 기다리거나 지하철로 전환하세요." },
      { mode: "taxi", durationMinutes: 25, boardAt: req.origin, alightAt: req.destination, firstWalkMinutes: 1, lastWalkMinutes: 1, crossingsToStop: 0, crossingsFromStop: 0, taxiFareKrw: 16000, missedFallback: "택시가 안 잡히면 지하철이 확실합니다." },
    ],
    good: (req) => {
      const isCafe = !req.placeType || req.placeType === "cafe" || req.mood === "romantic";
      if (isCafe) return { concept: "한 잔 여유를 챙기고 가는 길", stopBy: `${req.origin} 인근 카페 → 이동 → ${req.destination}`, detour: "출발지 근처 카페 한 잔 후 탑승", extraMinutesRange: [6, 10], reason: "여유 5분이 하루를 바꿉니다.", finalAction: "카페 들렀다 출발하세요. 기분이 달라집니다." };
      return { concept: "큰길 대신 골목으로 걸어보는 코스", stopBy: `${req.origin} → 이면도로 산책 → ${req.destination}`, detour: "차도 적은 골목으로 짧게 우회", extraMinutesRange: [8, 14], reason: "조금만 돌아가면 소음이 확 줄어듭니다.", finalAction: "이어폰 끼고 골목길로 걸어가세요. 10분이면 충분합니다." };
    },
  },
];

function applyWeatherContext(options: RouteOption[], weather?: WeatherContext): RouteOption[] {
  if (!weather || weather === "clear") return options;
  if (weather === "rain") {
    return options.map((o) => o.mode === "taxi"
      ? { ...o, missedFallback: "비 오는 날은 택시 대기가 길어집니다. 5분 안에 안 잡히면 지하철로 전환하세요." }
      : { ...o, firstWalkMinutes: o.firstWalkMinutes + 2, missedFallback: `${o.missedFallback} 비 올 때는 미끄러우니 여유 있게 이동하세요.` });
  }
  if (weather === "snow") {
    return options.map((o) => o.mode === "taxi"
      ? { ...o, durationMinutes: o.durationMinutes + 10, missedFallback: "눈 오는 날은 도로가 느립니다. 지하철이 더 확실합니다." }
      : { ...o, firstWalkMinutes: o.firstWalkMinutes + 3, missedFallback: `${o.missedFallback} 눈길 조심하세요. 여유 있게 걸으세요.` });
  }
  return options;
}

export class MockRouteProvider implements RouteProvider {
  async getRouteOptions(req: RouteRequest): Promise<RouteOption[]> {
    const fixture = fixtures.find((f) => f.match(req.origin, req.destination))!;
    const options = fixture.routes(req);
    const filtered = req.includeTaxi === false ? options.filter((o) => o.mode !== "taxi") : options;
    return applyWeatherContext(filtered, req.weather);
  }

  async getGoodRoute(req: GoodRouteRequest): Promise<GoodRouteSuggestion> {
    const fixture = fixtures.find((f) => f.match(req.origin, req.destination))!;
    return fixture.good(req);
  }
}
