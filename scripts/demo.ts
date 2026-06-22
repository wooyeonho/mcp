import { KakaoLocalProvider } from "../src/providers/kakaoLocalProvider.js";
import { KakaoMobilityProvider } from "../src/providers/kakaoMobilityProvider.js";
import { getFastestRouteAction } from "../src/tools/getFastestRouteAction.js";
import { getGoodRoute } from "../src/tools/getGoodRoute.js";
import { saveUserPlaces } from "../src/tools/saveUserPlaces.js";
import type { WeatherContext } from "../src/providers/types.js";

// v0.3.0: KakaoMobilityProvider (mock-first, real API when KAKAO_REST_API_KEY is set)
//         KakaoLocalProvider   (fixture-first, real Kakao Local when API key is set)
const route = new KakaoMobilityProvider(process.env.KAKAO_REST_API_KEY);
const place = new KakaoLocalProvider(process.env.KAKAO_REST_API_KEY);
const DEMO_USER = "demo-user";

const mockWeatherClear = async (): Promise<WeatherContext> => "clear";
const mockWeatherRain  = async (): Promise<WeatherContext> => "rain";
const mockWeatherSnow  = async (): Promise<WeatherContext> => "snow";

const divider = (n: number, title: string) =>
  console.log(`\n${"=".repeat(55)}\n[${n}. ${title}]\n${"=".repeat(55)}`);

// 1. 별칭 포함 장소 저장
divider(1, "장소 저장 (별칭 포함)");
console.log(await saveUserPlaces({
  home: "신림역 근처",
  work: "강남역 근처",
  aliases: [{ name: "스터디카페", address: "홍대입구역 근처" }],
}, DEMO_USER));

// 2. 출근
divider(2, "출근 (신림→강남)");
console.log(await getFastestRouteAction({ query: "출근" }, route, DEMO_USER));

// 3. 퇴근
divider(3, "퇴근 (강남→신림)");
console.log(await getFastestRouteAction({ query: "퇴근" }, route, DEMO_USER));

// 4. 퇴근 낭만 (카페 우회)
divider(4, "퇴근 낭만 — 카페 우회 + 카카오맵 딥링크");
console.log(await getGoodRoute({ query: "퇴근 낭만" }, route, place, DEMO_USER));

// 5. 강남→홍대입구 빨리
divider(5, "강남→홍대입구 빨리");
console.log(await getFastestRouteAction({ query: "회사에서 홍대입구 빨리" }, route, DEMO_USER));

// 6. 출발지 방어 (강남역 빨리 → 출발지 질문)
divider(6, "강남역 빨리 — 출발지 방어");
console.log(await getFastestRouteAction({ query: "강남역 빨리" }, route, DEMO_USER));

// 7. 집 가는 길 카페
divider(7, "집 가는 길 카페 (강남→신림 경로상 카페)");
console.log(await getGoodRoute({ query: "집 가는 길 카페", currentLocation: "강남역 근처" }, route, place, DEMO_USER));

// 8. 20분 산책길
divider(8, "퇴근 20분만 돌아가는 산책길");
console.log(await getGoodRoute({ query: "퇴근 20분만 돌아가는 산책길", placeType: "walk" }, route, place, DEMO_USER));

// 9. 약속 늦었어 — recentDestination 자동 활용
divider(9, "약속 늦었어 — 최근 목적지 자동 활용");
console.log(await getFastestRouteAction({ query: "약속 늦었어", currentLocation: "강남역 근처" }, route, DEMO_USER));

// 10. 약속 전에 혼밥
divider(10, "약속 전에 혼밥 (강남→홍대 경로상 식당)");
console.log(await getGoodRoute({ query: "회사에서 홍대입구 약속 전에 혼밥", placeType: "restaurant" }, route, place, DEMO_USER));

// 11. 비 오는데 퇴근 (날씨 context)
divider(11, "비 오는데 퇴근 — 날씨 경고 + 도보 보정");
console.log(await getFastestRouteAction({ query: "비 오는데 퇴근" }, route, DEMO_USER));

// 12. 비 오는 날 퇴근 낭만
divider(12, "비 오는 날 퇴근 낭만 — 실내 위주 추천");
console.log(await getGoodRoute({ query: "비 오는데 퇴근 낭만" }, route, place, DEMO_USER));

// 13. 약속 늦었어 (목적지 모름) — 목적지 질문
divider(13, "약속 늦었어 (목적지 모름) — 목적지 질문");
const DEMO_USER_2 = "demo-user-no-recent";
await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }, DEMO_USER_2);
console.log(await getFastestRouteAction({ query: "약속 늦었어" }, route, DEMO_USER_2));

// 14. 눈 오는 날 퇴근 (snow)
divider(14, "눈 오는 날 퇴근 — 눈길 경고 + 지하철 우선");
console.log(await getFastestRouteAction({ query: "눈 오는데 퇴근" }, route, DEMO_USER));

// 15. 자동 날씨 주입 (mockWeatherRain)
divider(15, "자동 날씨 감지 (비) — Open-Meteo 연동 시뮬레이션");
console.log(await getFastestRouteAction({ query: "퇴근" }, route, DEMO_USER, mockWeatherRain));

// 16. 도착 마감 (N시까지)
divider(16, "오후 8시까지 퇴근 — 도착 마감 계산");
console.log(await getFastestRouteAction({ query: "퇴근 오후 8시까지" }, route, DEMO_USER));

// 17. 여의도→강남 (9호선 fixture)
divider(17, "여의도→강남 — 9호선 급행 + 한강공원 코스");
const DEMO_YEOUIDO = "demo-yeouido";
await saveUserPlaces({ home: "여의도역 근처", work: "강남역 근처" }, DEMO_YEOUIDO);
console.log(await getFastestRouteAction({ query: "출근" }, route, DEMO_YEOUIDO));

// 18. 별칭 사용 (스터디카페 → 홍대입구역 근처)
divider(18, "별칭 사용 — 스터디카페 = 홍대입구역 근처");
console.log(await getFastestRouteAction({ query: "회사에서 스터디카페 빨리" }, route, DEMO_USER));

// 19. 성수동 카페 코스
divider(19, "성수동 카페 — 성수 카페거리 추천");
console.log(await getGoodRoute({ query: "강남역에서 성수역 카페" }, route, place, DEMO_USER));

// 20. 인천공항
divider(20, "인천공항 — 공항철도/리무진/택시 비교");
console.log(await getFastestRouteAction({ query: "강남역에서 인천공항 빨리" }, route, DEMO_USER));

console.log(`\n${"=".repeat(55)}`);
console.log("데모 완료: 20개 시나리오 실행 성공");
if (process.env.KAKAO_REST_API_KEY) {
  console.log("✓ Kakao API 키 감지됨 — 실제 Kakao Local + Mobility API 사용");
} else {
  console.log("  KAKAO_REST_API_KEY 미설정 — fixture/mock 모드로 실행");
}
console.log(`${"=".repeat(55)}`);
