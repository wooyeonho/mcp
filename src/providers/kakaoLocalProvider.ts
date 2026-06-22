import type { Coords, PlaceProvider, PlaceSuggestion, PlaceType } from "./types.js";

const KAKAO_LOCAL_BASE = "https://dapi.kakao.com/v2/local";

const CATEGORY_CODE: Partial<Record<PlaceType, string>> = {
  cafe: "CE7",
  dessert: "CE7",
  restaurant: "FD6",
};

// Pre-seeded coordinates for major Seoul stations (no API key needed for these)
const KNOWN: Array<[string, number, number]> = [
  ["강남역", 37.4979, 127.0276],
  ["신림역", 37.4844, 126.9294],
  ["홍대입구역", 37.5571, 126.9246],
  ["홍대입구", 37.5571, 126.9246],
  ["합정역", 37.5496, 126.9143],
  ["합정", 37.5496, 126.9143],
  ["서울역", 37.5550, 126.9707],
  ["종로3가", 37.5718, 126.9919],
  ["명동역", 37.5636, 126.9853],
  ["명동", 37.5636, 126.9853],
  ["이태원역", 37.5344, 126.9940],
  ["이태원", 37.5344, 126.9940],
  ["성수역", 37.5446, 127.0558],
  ["건대입구역", 37.5401, 127.0702],
  ["잠실역", 37.5133, 127.1001],
  ["잠실", 37.5133, 127.1001],
  ["사당역", 37.4765, 126.9814],
  ["선릉역", 37.5048, 127.0489],
  ["삼성역", 37.5088, 127.0634],
  ["역삼역", 37.5006, 127.0364],
  ["교대역", 37.4928, 127.0142],
  ["서초역", 37.4837, 127.0113],
  ["구로디지털단지역", 37.4851, 126.9014],
  ["신대방역", 37.4874, 126.9136],
  ["대림역", 37.4925, 126.8968],
  ["신도림역", 37.5087, 126.8912],
  ["영등포구청역", 37.5259, 126.8960],
  ["영등포역", 37.5157, 126.9075],
  ["여의도역", 37.5218, 126.9247],
  ["여의도", 37.5218, 126.9247],
  ["신촌역", 37.5552, 126.9368],
  ["신촌", 37.5552, 126.9368],
  ["이대역", 37.5562, 126.9466],
  ["충정로역", 37.5582, 126.9610],
  ["시청역", 37.5656, 126.9769],
  ["을지로입구역", 37.5663, 126.9820],
  ["동대문역사문화공원역", 37.5651, 127.0075],
  ["왕십리역", 37.5614, 127.0375],
  ["뚝섬역", 37.5476, 127.0470],
  ["압구정역", 37.5271, 127.0279],
  ["압구정", 37.5271, 127.0279],
  ["신사역", 37.5163, 127.0196],
  ["논현역", 37.5113, 127.0225],
  ["학동역", 37.5088, 127.0396],
  ["강변역", 37.5341, 127.0944],
  ["천호역", 37.5389, 127.1238],
  ["광화문역", 37.5716, 126.9766],
  ["광화문", 37.5716, 126.9766],
  ["경복궁역", 37.5765, 126.9769],
  ["안국역", 37.5780, 126.9851],
  ["종각역", 37.5703, 126.9822],
  ["동대문역", 37.5715, 127.0096],
  ["동묘앞역", 37.5711, 127.0167],
  ["신설동역", 37.5753, 127.0261],
  ["용두역", 37.5740, 127.0357],
  ["신답역", 37.5672, 127.0395],
];

export async function geocodePlace(placeName: string, kakaoApiKey?: string): Promise<Coords | undefined> {
  const lower = placeName.replace(/\s/g, "");
  for (const [name, lat, lng] of KNOWN) {
    if (lower.includes(name.replace(/\s/g, "")) || name.replace(/\s/g, "").includes(lower)) {
      return { lat, lng };
    }
  }
  if (!kakaoApiKey) return undefined;
  try {
    const url = `${KAKAO_LOCAL_BASE}/search/keyword.json?query=${encodeURIComponent(placeName)}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { documents: Array<{ x: string; y: string }> };
    const doc = data.documents?.[0];
    if (!doc) return undefined;
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
  } catch {
    return undefined;
  }
}

// Fixture-based place data (used when no API key or API fails)
interface PlaceFixture {
  match: (o: string, d: string) => boolean;
  places: Partial<Record<PlaceType, PlaceSuggestion[]>>;
}

const placeFixtures: PlaceFixture[] = [
  {
    match: (o, d) => o.includes("강남") && d.includes("신림"),
    places: {
      cafe: [
        { name: "강남역 뒤편 조용한 카페", type: "cafe", note: "퇴근길 방향이라 우회 없음", extraMinutes: 6 },
        { name: "서초 골목 로스터리", type: "cafe", note: "한적하고 자리 넓음", extraMinutes: 8 },
      ],
      restaurant: [
        { name: "강남 지하상가 덮밥집", type: "restaurant", note: "10분이면 식사 끝, 회전 빠름", extraMinutes: 12 },
        { name: "역삼 혼밥 우동집", type: "restaurant", note: "줄 없고 맛 보장", extraMinutes: 15 },
      ],
      walk: [{ name: "서초 이면도로 산책길", type: "walk", note: "차 거의 없는 조용한 골목", extraMinutes: 10 }],
      dessert: [{ name: "강남역 크로플 가게", type: "dessert", note: "포장 가능, 3분 대기", extraMinutes: 5 }],
      any: [{ name: "강남역 뒤편 조용한 카페", type: "cafe", note: "퇴근길 방향이라 우회 없음", extraMinutes: 6 }],
    },
  },
  {
    match: (o, d) => o.includes("신림") && d.includes("강남"),
    places: {
      cafe: [{ name: "신림역 앞 테이크아웃 카페", type: "cafe", note: "출근길 1분 우회", extraMinutes: 3 }],
      restaurant: [{ name: "신림 김밥천국", type: "restaurant", note: "아침 식사 5분 해결", extraMinutes: 8 }],
      walk: [{ name: "관악산 입구 산책로", type: "walk", note: "10분 코스, 공기 좋음", extraMinutes: 12 }],
      dessert: [{ name: "신림역 빵집", type: "dessert", note: "출근길 간식 포장", extraMinutes: 3 }],
      any: [{ name: "신림역 앞 테이크아웃 카페", type: "cafe", note: "출근길 1분 우회", extraMinutes: 3 }],
    },
  },
  {
    match: (o, d) => o.includes("강남") && (d.includes("홍대") || d.includes("합정")),
    places: {
      cafe: [
        { name: "합정 골목 카페", type: "cafe", note: "홍대 한 정거장 전, 분위기 좋음", extraMinutes: 8 },
        { name: "연남동 루프탑 카페", type: "cafe", note: "홍대 방향 걷다 들르기 좋음", extraMinutes: 10 },
      ],
      restaurant: [
        { name: "강남역 지하 혼밥 덮밥", type: "restaurant", note: "약속 전 빠르게 한 끼", extraMinutes: 12 },
        { name: "합정역 국밥집", type: "restaurant", note: "든든하고 빠름", extraMinutes: 10 },
      ],
      walk: [{ name: "합정~홍대 걷기 코스", type: "walk", note: "연남동 방향 산책", extraMinutes: 10 }],
      dessert: [{ name: "홍대입구 인근 마카롱", type: "dessert", note: "약속 선물용으로도 좋음", extraMinutes: 5 }],
      any: [{ name: "합정 골목 카페", type: "cafe", note: "홍대 한 정거장 전, 분위기 좋음", extraMinutes: 8 }],
    },
  },
  {
    match: (o, d) => o.includes("여의도") || d.includes("여의도"),
    places: {
      cafe: [{ name: "여의도 한강공원 앞 카페", type: "cafe", note: "한강뷰 자리 있음", extraMinutes: 5 }],
      restaurant: [{ name: "여의도 IFC몰 식당가", type: "restaurant", note: "다양한 선택지", extraMinutes: 10 }],
      walk: [{ name: "여의도 한강공원 산책로", type: "walk", note: "서울 최고 한강 산책 코스", extraMinutes: 12 }],
      dessert: [{ name: "여의도 파크원 디저트 카페", type: "dessert", note: "고급 디저트, 분위기 좋음", extraMinutes: 8 }],
      any: [{ name: "여의도 한강공원 앞 카페", type: "cafe", note: "한강뷰 자리 있음", extraMinutes: 5 }],
    },
  },
  {
    match: (o, d) => o.includes("성수") || d.includes("성수"),
    places: {
      cafe: [
        { name: "성수동 카페거리 로스터리", type: "cafe", note: "성수 특유의 감성 공간", extraMinutes: 6 },
        { name: "뚝섬한강공원 앞 카페", type: "cafe", note: "야외 테라스 좌석", extraMinutes: 8 },
      ],
      restaurant: [{ name: "성수동 수제버거", type: "restaurant", note: "성수 핫플, 기다릴 가치 있음", extraMinutes: 15 }],
      walk: [{ name: "성수 골목 산책", type: "walk", note: "카페·갤러리 사이 산책 코스", extraMinutes: 10 }],
      dessert: [{ name: "성수동 소프트 아이스크림", type: "dessert", note: "SNS 유명 디저트", extraMinutes: 5 }],
      any: [{ name: "성수동 카페거리 로스터리", type: "cafe", note: "성수 특유의 감성 공간", extraMinutes: 6 }],
    },
  },
];

const defaultPlaces: Record<string, PlaceSuggestion[]> = {
  cafe: [
    { name: "인근 조용한 카페", type: "cafe", note: "경로 근처 작은 우회", extraMinutes: 6 },
    { name: "역 근처 스타벅스", type: "cafe", note: "자리 넉넉하고 접근 쉬움", extraMinutes: 4 },
  ],
  restaurant: [
    { name: "혼밥하기 좋은 덮밥집", type: "restaurant", note: "역에서 가깝고 회전 빠름", extraMinutes: 12 },
    { name: "인근 국밥집", type: "restaurant", note: "든든하고 빠름", extraMinutes: 10 },
  ],
  walk: [{ name: "이면도로 산책길", type: "walk", note: "차 적은 골목으로 짧게 우회", extraMinutes: 10 }],
  dessert: [
    { name: "역 근처 디저트 가게", type: "dessert", note: "포장 가능, 대기 짧음", extraMinutes: 5 },
  ],
  any: [{ name: "인근 조용한 카페", type: "cafe", note: "경로 근처 작은 우회", extraMinutes: 6 }],
};

export class KakaoLocalProvider implements PlaceProvider {
  constructor(private readonly apiKey?: string) {}

  async findAlongRoute(origin: string, destination: string, type: PlaceType): Promise<PlaceSuggestion[]> {
    if (!this.apiKey) return this.fixturePlaces(origin, destination, type);

    const [oCoords, dCoords] = await Promise.all([
      geocodePlace(origin, this.apiKey),
      geocodePlace(destination, this.apiKey),
    ]);

    if (!oCoords || !dCoords) return this.fixturePlaces(origin, destination, type);
    if (type === "walk") return this.fixturePlaces(origin, destination, type);

    const midLat = (oCoords.lat + dCoords.lat) / 2;
    const midLng = (oCoords.lng + dCoords.lng) / 2;
    const distKm = Math.sqrt(
      Math.pow((oCoords.lat - dCoords.lat) * 111, 2) +
      Math.pow((oCoords.lng - dCoords.lng) * 88, 2),
    );
    const radius = Math.min(Math.max(Math.round(distKm * 350), 300), 1000);

    try {
      const catCode = CATEGORY_CODE[type];
      const queryWord =
        type === "cafe" || type === "dessert" ? "카페" : "맛집 혼밥";

      const params = new URLSearchParams({
        query: queryWord,
        x: String(midLng),
        y: String(midLat),
        radius: String(radius),
        size: "5",
        sort: "distance",
        ...(catCode ? { category_group_code: catCode } : {}),
      });

      const res = await fetch(`${KAKAO_LOCAL_BASE}/search/keyword.json?${params}`, {
        headers: { Authorization: `KakaoAK ${this.apiKey}` },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return this.fixturePlaces(origin, destination, type);

      const data = (await res.json()) as {
        documents: Array<{
          place_name: string;
          category_name: string;
          distance: string;
          road_address_name: string;
        }>;
      };

      if (!data.documents?.length) return this.fixturePlaces(origin, destination, type);

      return data.documents.slice(0, 3).map((doc) => ({
        name: doc.place_name,
        type,
        note: doc.category_name.split(">").pop()?.trim() ?? "추천 장소",
        extraMinutes: Math.max(3, Math.ceil(parseInt(doc.distance || "300") / 67)),
      }));
    } catch {
      return this.fixturePlaces(origin, destination, type);
    }
  }

  private fixturePlaces(origin: string, destination: string, type: PlaceType): PlaceSuggestion[] {
    const fixture = placeFixtures.find((f) => f.match(origin, destination));
    if (fixture) {
      return (fixture.places[type] ?? fixture.places.any) as PlaceSuggestion[];
    }
    return this.genericPlaces(origin, type);
  }

  private genericPlaces(origin: string, type: PlaceType): PlaceSuggestion[] {
    const area = KNOWN.find(([name]) => origin.includes(name))?.[0]?.replace("역", "") ?? origin.split("역")[0];
    const typed = defaultPlaces[type] ?? defaultPlaces.any;
    return typed.map((p) => ({ ...p, name: p.name.includes("인근") ? `${area} ${p.name}` : p.name }));
  }
}
