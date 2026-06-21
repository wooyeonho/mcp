import type { PlaceProvider, PlaceSuggestion, PlaceType } from "./types.js";

interface PlaceFixture {
  match: (origin: string, destination: string) => boolean;
  places: Record<string, PlaceSuggestion[]>;
}

const placeFixtures: PlaceFixture[] = [
  {
    match: (o, d) => o.includes("강남") && d.includes("신림"),
    places: {
      cafe: [{ name: "강남역 뒤편 조용한 카페", type: "cafe", note: "퇴근길 방향이라 우회 없음", extraMinutes: 6 }, { name: "서초 골목 로스터리", type: "cafe", note: "한적하고 자리 넓음", extraMinutes: 8 }],
      restaurant: [{ name: "강남 지하상가 덮밥집", type: "restaurant", note: "10분이면 식사 끝, 회전 빠름", extraMinutes: 12 }, { name: "역삼 혼밥 우동집", type: "restaurant", note: "줄 없고 맛 보장", extraMinutes: 15 }],
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
    match: (o, d) => o.includes("강남") && d.includes("홍대"),
    places: {
      cafe: [{ name: "합정 골목 카페", type: "cafe", note: "홍대 한 정거장 전, 분위기 좋음", extraMinutes: 8 }],
      restaurant: [{ name: "강남역 지하 혼밥 덮밥", type: "restaurant", note: "약속 전 빠르게 한 끼", extraMinutes: 12 }],
      walk: [{ name: "합정~홍대 걷기 코스", type: "walk", note: "연남동 방향 산책", extraMinutes: 10 }],
      dessert: [{ name: "홍대입구 인근 마카롱", type: "dessert", note: "약속 선물용으로도 좋음", extraMinutes: 5 }],
      any: [{ name: "합정 골목 카페", type: "cafe", note: "홍대 한 정거장 전, 분위기 좋음", extraMinutes: 8 }],
    },
  },
];

const defaultPlaces: Record<string, PlaceSuggestion[]> = {
  cafe: [{ name: "인근 조용한 카페", type: "cafe", note: "경로 근처 작은 우회", extraMinutes: 6 }],
  restaurant: [{ name: "혼밥하기 좋은 덮밥집", type: "restaurant", note: "역에서 가깝고 회전 빠름", extraMinutes: 12 }],
  walk: [{ name: "이면도로 산책길", type: "walk", note: "차 적은 골목으로 짧게 우회", extraMinutes: 10 }],
  dessert: [{ name: "역 근처 디저트 가게", type: "dessert", note: "포장 가능, 대기 짧음", extraMinutes: 5 }],
  any: [{ name: "인근 조용한 카페", type: "cafe", note: "경로 근처 작은 우회", extraMinutes: 6 }],
};

export class MockPlaceProvider implements PlaceProvider {
  async findAlongRoute(origin: string, destination: string, type: PlaceType): Promise<PlaceSuggestion[]> {
    const fixture = placeFixtures.find((f) => f.match(origin, destination));
    if (fixture) return fixture.places[type] ?? fixture.places.any;
    return defaultPlaces[type] ?? defaultPlaces.any;
  }
}
