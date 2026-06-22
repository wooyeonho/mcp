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

export class KakaoLocalProvider implements PlaceProvider {
  constructor(private readonly apiKey?: string) {}

  async findAlongRoute(origin: string, destination: string, type: PlaceType): Promise<PlaceSuggestion[]> {
    if (!this.apiKey) return this.mockPlaces(origin, type);

    const [oCoords, dCoords] = await Promise.all([
      geocodePlace(origin, this.apiKey),
      geocodePlace(destination, this.apiKey),
    ]);

    if (!oCoords || !dCoords) return this.mockPlaces(origin, type);
    if (type === "walk") return this.mockWalkPlaces(origin);

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
      if (!res.ok) return this.mockPlaces(origin, type);

      const data = (await res.json()) as {
        documents: Array<{
          place_name: string;
          category_name: string;
          distance: string;
          road_address_name: string;
        }>;
      };

      if (!data.documents?.length) return this.mockPlaces(origin, type);

      return data.documents.slice(0, 3).map((doc) => ({
        name: doc.place_name,
        type,
        note: doc.category_name.split(">").pop()?.trim() ?? "추천 장소",
        extraMinutes: Math.max(3, Math.ceil(parseInt(doc.distance || "300") / 67)),
      }));
    } catch {
      return this.mockPlaces(origin, type);
    }
  }

  private mockPlaces(origin: string, type: PlaceType): PlaceSuggestion[] {
    if (type === "walk") return this.mockWalkPlaces(origin);
    const area = KNOWN.find(([name]) => origin.includes(name))?.[0]?.replace("역", "") ?? origin.split("역")[0];
    if (type === "cafe" || type === "dessert") {
      return [
        { name: `${area} 조용한 카페`, type, note: "경로상 5분 거리", extraMinutes: 5 },
        { name: `${area} 스타벅스`, type, note: "접근 편리, 좌석 많음", extraMinutes: 3 },
      ];
    }
    return [
      { name: `${area} 혼밥 맛집`, type, note: "10분 컷 가능", extraMinutes: 12 },
      { name: `${area} 간편 식사`, type, note: "빠른 테이블 회전", extraMinutes: 8 },
    ];
  }

  private mockWalkPlaces(origin: string): PlaceSuggestion[] {
    if (origin.includes("강남")) return [{ name: "서초 이면도로 산책길", type: "walk", note: "차 없는 조용한 골목", extraMinutes: 10 }];
    if (origin.includes("신림")) return [{ name: "신림 근린공원 산책로", type: "walk", note: "녹지 코스", extraMinutes: 8 }];
    if (origin.includes("홍대")) return [{ name: "홍대 골목길 산책", type: "walk", note: "거리 분위기 좋음", extraMinutes: 10 }];
    return [{ name: `${origin.split("역")[0]} 인근 산책로`, type: "walk", note: "조용한 이면도로", extraMinutes: 10 }];
  }
}
