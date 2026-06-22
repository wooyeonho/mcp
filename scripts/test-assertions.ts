import { KakaoLocalProvider } from "../src/providers/kakaoLocalProvider.js";
import { KakaoMobilityProvider } from "../src/providers/kakaoMobilityProvider.js";
import { MockPlaceProvider } from "../src/providers/mockPlaceProvider.js";
import { MockRouteProvider } from "../src/providers/mockRouteProvider.js";
import { getFastestRouteAction } from "../src/tools/getFastestRouteAction.js";
import { getGoodRoute } from "../src/tools/getGoodRoute.js";
import { saveUserPlaces } from "../src/tools/saveUserPlaces.js";
import type { WeatherContext } from "../src/providers/types.js";

const route = new MockRouteProvider();
const place = new KakaoLocalProvider(); // KakaoLocalProvider (no API key → fixture mode)
const mockPlace = new MockPlaceProvider();
const kakaoRoute = new KakaoMobilityProvider(); // no API key → mock passthrough
const U = "test-user-main";

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string) {
  if (condition) { pass++; console.log(`PASS: ${label}`); }
  else { fail++; console.error(`FAIL: ${label}`); }
}

const mockWeatherClear = async (): Promise<WeatherContext> => "clear";
const mockWeatherRain = async (): Promise<WeatherContext> => "rain";
const mockWeatherSnow = async (): Promise<WeatherContext> => "snow";

// ─── Setup ────────────────────────────────────────────────────────────────────
await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }, U);

// ═══════════════════════════════════════════════════════════════════
// § 1. 출근 기본
// ═══════════════════════════════════════════════════════════════════
const commute = await getFastestRouteAction({ query: "출근" }, route, U);
assert(commute.includes("신림역"), "출근: origin 신림");
assert(commute.includes("강남역"), "출근: dest 강남");
assert(commute.includes("지금 할 행동"), "출근: 행동 섹션");
assert(commute.includes("비교"), "출근: 비교 섹션");
assert(commute.includes("놓치면"), "출근: 놓치면 섹션");
assert(commute.includes("2호선"), "출근: 2호선");
assert(commute.includes("5008번"), "출근: 5008번 버스");

// ═══════════════════════════════════════════════════════════════════
// § 2. 퇴근 기본
// ═══════════════════════════════════════════════════════════════════
const goHome = await getFastestRouteAction({ query: "퇴근" }, route, U);
assert(goHome.includes("강남역"), "퇴근: origin 강남");
assert(goHome.includes("신림역"), "퇴근: dest 신림");
assert(goHome.includes("38분"), "퇴근: 38분 지하철");
assert(goHome.includes("146번"), "퇴근: 146번 버스");
assert(goHome.includes("18,000"), "퇴근: 택시 요금");
assert(goHome.includes("횡단보도"), "퇴근: 횡단보도 언급");
assert(goHome.includes("현실 총 소요시간"), "퇴근: 현실 총 소요시간");
assert(goHome.includes("실제 약"), "퇴근: 실제 약 N분");

// ═══════════════════════════════════════════════════════════════════
// § 3. 퇴근 낭만 (good route)
// ═══════════════════════════════════════════════════════════════════
const romantic = await getGoodRoute({ query: "퇴근 낭만" }, route, place, U);
assert(romantic.includes("카페"), "퇴근 낭만: 카페 포함");
assert(romantic.includes("시간 없으면"), "퇴근 낭만: 대안 섹션");
assert(romantic.includes("코스:"), "퇴근 낭만: 코스 컨셉");
assert(romantic.includes("카카오 바로 이동"), "퇴근 낭만: 딥링크 섹션");
assert(romantic.includes("map.kakao.com"), "퇴근 낭만: 카카오맵 링크");

// ═══════════════════════════════════════════════════════════════════
// § 4. 강남→홍대 빨리
// ═══════════════════════════════════════════════════════════════════
const toHongdae = await getFastestRouteAction({ query: "회사에서 홍대입구 빨리" }, route, U);
assert(toHongdae.includes("강남역"), "홍대빨리: origin 강남");
assert(toHongdae.includes("홍대"), "홍대빨리: dest 홍대");
assert(toHongdae.includes("472번"), "홍대빨리: 472번 fixture");
assert(!toHongdae.includes("늦었습니다"), "홍대빨리: 빨리≠늦음");
assert(toHongdae.includes("지금 바로"), "홍대빨리: 정상 결론");

// ═══════════════════════════════════════════════════════════════════
// § 5. 출발지 방어 (no origin)
// ═══════════════════════════════════════════════════════════════════
const noOrigin = await getFastestRouteAction({ query: "강남역 빨리" }, route, U);
assert(noOrigin.includes("출발지"), "출발지방어: 출발지 질문");
assert(noOrigin.includes("알려주세요"), "출발지방어: 질문 톤");

// ═══════════════════════════════════════════════════════════════════
// § 6. 비 오는데 퇴근 (rain weather from query)
// ═══════════════════════════════════════════════════════════════════
const rainCommute = await getFastestRouteAction({ query: "비 오는데 퇴근" }, route, U);
assert(rainCommute.includes("비 오는 날"), "비퇴근: 날씨 프리픽스");
assert(rainCommute.includes("+2분"), "비퇴근: +2분 보정 텍스트");
assert(rainCommute.includes("7분"), "비퇴근: 보정된 도보 시간 (5+2)");
assert(rainCommute.includes("미끄러우니"), "비퇴근: 미끄럼 경고");

// ═══════════════════════════════════════════════════════════════════
// § 7. 비 오는 날 퇴근 (alternative rain phrasing)
// ═══════════════════════════════════════════════════════════════════
const rainCommute2 = await getFastestRouteAction({ query: "비 오는 날 퇴근" }, route, U);
assert(rainCommute2.includes("비 오는 날"), "비퇴근2: 날씨 프리픽스");
assert(rainCommute2.includes("강남역"), "비퇴근2: 출발지 강남");

// ═══════════════════════════════════════════════════════════════════
// § 8. 눈 오는데 퇴근 (snow weather)
// ═══════════════════════════════════════════════════════════════════
const snowCommute = await getFastestRouteAction({ query: "눈 오는데 퇴근" }, route, U);
assert(snowCommute.includes("눈 오는 날"), "눈퇴근: 날씨 프리픽스");
assert(snowCommute.includes("미끄럼"), "눈퇴근: 미끄럼 경고 or 주의");
assert(snowCommute.includes("강남역"), "눈퇴근: 출발지 강남");

// ═══════════════════════════════════════════════════════════════════
// § 9. 비 오는 날 퇴근 낭만 (rain + good route)
// ═══════════════════════════════════════════════════════════════════
const rainGood = await getGoodRoute({ query: "비 오는데 퇴근 낭만" }, route, place, U);
assert(rainGood.includes("실내 위주"), "비낭만: 실내 추천 프리픽스");
assert(rainGood.includes("카페"), "비낭만: 카페 추천 유지");

// ═══════════════════════════════════════════════════════════════════
// § 10. 눈 오는 날 퇴근 낭만 (snow + good route)
// ═══════════════════════════════════════════════════════════════════
const snowGood = await getGoodRoute({ query: "눈 오는데 퇴근 낭만" }, route, place, U);
assert(snowGood.includes("따뜻한 실내"), "눈낭만: 따뜻한 실내 프리픽스");
assert(snowGood.includes("카페"), "눈낭만: 카페 추천 유지");

// ═══════════════════════════════════════════════════════════════════
// § 11. 자동 날씨 주입 (auto weather via fetchWeather)
// ═══════════════════════════════════════════════════════════════════
const autoRain = await getFastestRouteAction({ query: "퇴근" }, route, U, mockWeatherRain);
assert(autoRain.includes("현재 서울 날씨"), "자동날씨(비): 자동 날씨 주입");
assert(autoRain.includes("비 오는 중"), "자동날씨(비): 비 오는 중 메시지");
assert(autoRain.includes("비 오는 날"), "자동날씨(비): 날씨 경고 줄");

const autoSnow = await getFastestRouteAction({ query: "퇴근" }, route, U, mockWeatherSnow);
assert(autoSnow.includes("현재 서울 날씨"), "자동날씨(눈): 자동 날씨 주입");
assert(autoSnow.includes("눈 오는 중"), "자동날씨(눈): 눈 오는 중 메시지");

const autoClear = await getFastestRouteAction({ query: "퇴근" }, route, U, mockWeatherClear);
assert(!autoClear.includes("현재 서울 날씨"), "자동날씨(맑음): 맑을 때 날씨 노출 없음");

// ═══════════════════════════════════════════════════════════════════
// § 12. 약속 늦었어 — recentDestination 활용
// ═══════════════════════════════════════════════════════════════════
const lateAppt = await getFastestRouteAction({ query: "약속 늦었어", currentLocation: "강남역 근처" }, route, U);
assert(lateAppt.includes("늦었습니다"), "늦었어: 긴급 결론");
assert(lateAppt.includes("택시"), "늦었어: 택시 우선");
assert(lateAppt.includes("카카오T"), "늦었어: 카카오T 안내");
assert(!lateAppt.includes("알려주세요"), "늦었어: 질문 안 함 (recentDest 활용)");

// ═══════════════════════════════════════════════════════════════════
// § 13. 약속 늦었어 — 목적지 없는 새 유저
// ═══════════════════════════════════════════════════════════════════
const U2 = "test-user-no-recent";
await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }, U2);
const lateNoTarget = await getFastestRouteAction({ query: "약속 늦었어" }, route, U2);
assert(lateNoTarget.includes("알려주세요"), "늦었어(모름): 목적지 질문");

// ═══════════════════════════════════════════════════════════════════
// § 14. 산책길
// ═══════════════════════════════════════════════════════════════════
const walk = await getGoodRoute({ query: "퇴근 20분만 돌아가는 산책길", placeType: "walk" }, route, place, U);
assert(walk.includes("산책"), "산책: 산책 키워드");
assert(walk.includes("걸어"), "산책: 걸어가세요");

// ═══════════════════════════════════════════════════════════════════
// § 15. 혼밥
// ═══════════════════════════════════════════════════════════════════
const honbap = await getGoodRoute({ query: "회사에서 홍대입구 약속 전에 혼밥", placeType: "restaurant" }, route, place, U);
assert(honbap.includes("덮밥"), "혼밥: 덮밥 추천");
assert(honbap.includes("홍대"), "혼밥: 홍대 목적지");

// ═══════════════════════════════════════════════════════════════════
// § 16. 집 가는 길 카페
// ═══════════════════════════════════════════════════════════════════
const homeCafe = await getGoodRoute({ query: "집 가는 길 카페", currentLocation: "강남역 근처" }, route, place, U);
assert(homeCafe.includes("카페"), "집카페: 카페 포함");
assert(homeCafe.includes("신림"), "집카페: 신림 방향");

// ═══════════════════════════════════════════════════════════════════
// § 17. 딥링크 검증 (KakaoMap/KakaoT URLs)
// ═══════════════════════════════════════════════════════════════════
// 신림역의 좌표가 KNOWN 테이블에 있으므로 destCoords가 항상 채워짐
const deepLinkFastest = await getFastestRouteAction({ query: "퇴근" }, route, U);
assert(deepLinkFastest.includes("카카오 바로 이동"), "딥링크-fastest: 딥링크 섹션");
assert(deepLinkFastest.includes("map.kakao.com/link/to/"), "딥링크-fastest: 카카오맵 URL");
assert(deepLinkFastest.includes("37.4844"), "딥링크-fastest: 신림역 위도");
assert(deepLinkFastest.includes("126.9294"), "딥링크-fastest: 신림역 경도");
assert(deepLinkFastest.includes("t.kakao.com"), "딥링크-fastest: 카카오T URL");

const deepLinkGood = await getGoodRoute({ query: "퇴근 낭만" }, route, place, U);
assert(deepLinkGood.includes("카카오 바로 이동"), "딥링크-good: 딥링크 섹션");
assert(deepLinkGood.includes("map.kakao.com/link/to/"), "딥링크-good: 카카오맵 URL");

// ═══════════════════════════════════════════════════════════════════
// § 18. 여의도 → 강남 fixture
// ═══════════════════════════════════════════════════════════════════
const U4 = "test-yeouido";
// U4: home=여의도, work=강남 → 출근 = 여의도→강남 (fixture 방향과 일치)
await saveUserPlaces({ home: "여의도역 근처", work: "강남역 근처" }, U4);
const yeouido = await getFastestRouteAction({ query: "출근" }, route, U4);
assert(yeouido.includes("9호선"), "여의도→강남: 9호선");
assert(yeouido.includes("461번"), "여의도→강남: 461번 버스");
assert(yeouido.includes("13,000"), "여의도→강남: 택시 요금");

// ═══════════════════════════════════════════════════════════════════
// § 19. → 잠실 fixture
// ═══════════════════════════════════════════════════════════════════
const jamsil = await getFastestRouteAction({ query: "강남역에서 잠실 빨리" }, route, U);
assert(jamsil.includes("잠실"), "잠실: 목적지 잠실");
assert(jamsil.includes("3216번"), "잠실: 3216번 버스");

// ═══════════════════════════════════════════════════════════════════
// § 20. → 성수 fixture
// ═══════════════════════════════════════════════════════════════════
const seongsu = await getFastestRouteAction({ query: "강남역에서 성수역 빨리" }, route, U);
assert(seongsu.includes("성수"), "성수: 목적지 성수");
assert(seongsu.includes("302번"), "성수: 302번 버스");

// ═══════════════════════════════════════════════════════════════════
// § 21. → 서울역 fixture
// ═══════════════════════════════════════════════════════════════════
const seoulStation = await getFastestRouteAction({ query: "강남역에서 서울역 빨리" }, route, U);
assert(seoulStation.includes("서울역"), "서울역: 목적지");
assert(seoulStation.includes("1호선"), "서울역: 1호선");

// ═══════════════════════════════════════════════════════════════════
// § 22. → 인천공항 fixture
// ═══════════════════════════════════════════════════════════════════
const airport = await getFastestRouteAction({ query: "강남역에서 인천공항 빨리" }, route, U);
assert(airport.includes("공항철도"), "인천공항: 공항철도");
assert(airport.includes("9,500"), "인천공항: 공항철도 요금 9500원");
assert(airport.includes("공항리무진"), "인천공항: 리무진");
assert(airport.includes("15,000"), "인천공항: 리무진 요금 15000원");

// ═══════════════════════════════════════════════════════════════════
// § 23. → 병원 fixture
// ═══════════════════════════════════════════════════════════════════
const hospital = await getFastestRouteAction({ query: "강남역에서 서울대병원 빨리" }, route, U);
assert(hospital.includes("병원"), "병원: 목적지");
assert(hospital.includes("환승"), "병원: 2호선+환승 경로");

// ═══════════════════════════════════════════════════════════════════
// § 24. 성수 good route (카페거리)
// ═══════════════════════════════════════════════════════════════════
const seongsuGood = await getGoodRoute({ query: "강남역에서 성수역 카페" }, route, place, U);
assert(seongsuGood.includes("성수"), "성수카페: 성수 목적지");
assert(seongsuGood.includes("카페"), "성수카페: 카페 추천");

// ═══════════════════════════════════════════════════════════════════
// § 25. KakaoLocalProvider fixture (no API key → fixture mode)
// ═══════════════════════════════════════════════════════════════════
const kakaoPlaceGangnam = await place.findAlongRoute("강남역 근처", "신림역 근처", "cafe");
assert(kakaoPlaceGangnam.length > 0, "KakaoLocal: 강남→신림 카페 결과 있음");
assert(kakaoPlaceGangnam[0].type === "cafe", "KakaoLocal: 카페 타입 정확");
assert(typeof kakaoPlaceGangnam[0].extraMinutes === "number", "KakaoLocal: extraMinutes 숫자");

const kakaoPlaceRestaurant = await place.findAlongRoute("강남역 근처", "신림역 근처", "restaurant");
assert(kakaoPlaceRestaurant.length > 0, "KakaoLocal: 강남→신림 식당 결과 있음");
assert(kakaoPlaceRestaurant[0].type === "restaurant", "KakaoLocal: 식당 타입 정확");

const kakaoPlaceYeouido = await place.findAlongRoute("여의도역", "강남역", "cafe");
assert(kakaoPlaceYeouido.length > 0, "KakaoLocal: 여의도 카페 결과 있음");
assert(kakaoPlaceYeouido[0].name.includes("여의도") || kakaoPlaceYeouido[0].note.length > 0, "KakaoLocal: 여의도 장소 정보");

const kakaoPlaceSeongsu = await place.findAlongRoute("강남역", "성수역", "cafe");
assert(kakaoPlaceSeongsu.length > 0, "KakaoLocal: 성수 카페 결과 있음");

const kakaoPlaceDessert = await place.findAlongRoute("강남역 근처", "신림역 근처", "dessert");
assert(kakaoPlaceDessert.length > 0, "KakaoLocal: 강남→신림 디저트 결과 있음");
assert(kakaoPlaceDessert[0].type === "dessert", "KakaoLocal: 디저트 타입 정확");

// ═══════════════════════════════════════════════════════════════════
// § 26. geocodePlace — KNOWN 테이블 좌표 검증
// ═══════════════════════════════════════════════════════════════════
import { geocodePlace } from "../src/providers/kakaoLocalProvider.js";
const sinrimCoords = await geocodePlace("신림역");
assert(sinrimCoords !== undefined, "geocode: 신림역 좌표 반환");
assert(Math.abs((sinrimCoords?.lat ?? 0) - 37.4844) < 0.001, "geocode: 신림역 위도 정확");
assert(Math.abs((sinrimCoords?.lng ?? 0) - 126.9294) < 0.001, "geocode: 신림역 경도 정확");

const gangnamCoords = await geocodePlace("강남역");
assert(gangnamCoords !== undefined, "geocode: 강남역 좌표 반환");

const hongdaeCoords = await geocodePlace("홍대입구역");
assert(hongdaeCoords !== undefined, "geocode: 홍대입구역 좌표 반환");

const unknownCoords = await geocodePlace("존재하지않는역이름xyz");
assert(unknownCoords === undefined, "geocode: 미지원 장소 → undefined");

// ═══════════════════════════════════════════════════════════════════
// § 27. 인텐트 패턴 — "OO에서 OO"
// ═══════════════════════════════════════════════════════════════════
const fromTo = await getFastestRouteAction({ query: "신림역에서 강남역 빨리" }, route, U);
assert(fromTo.includes("신림역") || fromTo.includes("신림"), "에서패턴: 출발 신림역");
assert(fromTo.includes("강남역"), "에서패턴: 도착 강남역");

// ═══════════════════════════════════════════════════════════════════
// § 28. 인텐트 패턴 — "OO 가야 해"
// ═══════════════════════════════════════════════════════════════════
const hasToGo = await getFastestRouteAction({ query: "홍대입구 가야 해", currentLocation: "강남역 근처" }, route, U);
assert(hasToGo.includes("홍대"), "가야해패턴: 목적지 홍대");
assert(!hasToGo.includes("목적지를"), "가야해패턴: 목적지 질문 없음");

// ═══════════════════════════════════════════════════════════════════
// § 29. 인텐트 패턴 — "OO 어떻게 가"
// ═══════════════════════════════════════════════════════════════════
const howTo = await getFastestRouteAction({ query: "홍대입구 어떻게 가", currentLocation: "강남역 근처" }, route, U);
assert(howTo.includes("홍대"), "어떻게가패턴: 목적지 홍대");

// ═══════════════════════════════════════════════════════════════════
// § 30. 인텐트 패턴 — 도착 마감 ("N시까지")
// ═══════════════════════════════════════════════════════════════════
const deadline = await getFastestRouteAction({ query: "퇴근 오후 8시까지" }, route, U);
assert(deadline.includes("강남역") || deadline.includes("신림역"), "마감: 퇴근 경로 유지");
// 마감 시간이 아직 남아있으면 빠듯하지 않을 수 있지만, 결론 섹션은 있어야 함
assert(deadline.includes("지금 할 행동") || deadline.includes("빠듯"), "마감: 행동 또는 빠듯 섹션");

// ═══════════════════════════════════════════════════════════════════
// § 31. 별칭(alias) 저장 및 사용
// ═══════════════════════════════════════════════════════════════════
const U5 = "test-alias-user";
await saveUserPlaces({
  home: "신림역 근처",
  work: "강남역 근처",
  aliases: [{ name: "스터디", address: "홍대입구역 근처" }],
}, U5);
const aliasRoute = await getFastestRouteAction({ query: "회사에서 스터디 빨리" }, route, U5);
assert(aliasRoute.includes("홍대"), "별칭: 스터디=홍대입구 치환");

// ═══════════════════════════════════════════════════════════════════
// § 32. 디저트 placeType
// ═══════════════════════════════════════════════════════════════════
const dessertRoute = await getGoodRoute({ query: "퇴근 디저트", placeType: "dessert" }, route, place, U);
assert(dessertRoute.includes("디저트") || dessertRoute.includes("크로플") || dessertRoute.includes("빵"), "디저트: 디저트 장소 추천");

// ═══════════════════════════════════════════════════════════════════
// § 33. 멀티유저 격리
// ═══════════════════════════════════════════════════════════════════
const U3 = "test-user-isolated";
await saveUserPlaces({ home: "홍대역 근처", work: "합정역 근처" }, U3);
const u1Profile = await getFastestRouteAction({ query: "퇴근" }, route, U);
const u3Profile = await getFastestRouteAction({ query: "퇴근" }, route, U3);
assert(u1Profile.includes("강남역"), "멀티유저: U1은 강남역 출발");
assert(u3Profile.includes("합정"), "멀티유저: U3은 합정 출발");
assert(!u1Profile.includes("합정"), "멀티유저: U1에 합정 안 섞임");
assert(!u3Profile.includes("강남역"), "멀티유저: U3에 강남역 안 섞임");

// ═══════════════════════════════════════════════════════════════════
// § 34. KakaoMobilityProvider passthrough (no API key → mock)
// ═══════════════════════════════════════════════════════════════════
const kakaoRouteResult = await getFastestRouteAction({ query: "퇴근" }, kakaoRoute, U);
assert(kakaoRouteResult.includes("강남역"), "카카오라우팅: 출발지");
assert(kakaoRouteResult.includes("신림역"), "카카오라우팅: 목적지");
assert(kakaoRouteResult.includes("2호선"), "카카오라우팅: 지하철 유지 (no API key)");

// ═══════════════════════════════════════════════════════════════════
// § 35. save_user_places 검증
// ═══════════════════════════════════════════════════════════════════
const saveResult = await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }, U);
assert(saveResult.includes("저장"), "saveUserPlaces: 저장 확인 메시지");

const saveWithAlias = await saveUserPlaces({
  home: "신림역 근처",
  work: "강남역 근처",
  aliases: [{ name: "헬스장", address: "합정역 근처" }],
}, U);
assert(saveWithAlias.includes("저장") || saveWithAlias.includes("헬스장"), "saveUserPlaces: 별칭 저장");

// ═══════════════════════════════════════════════════════════════════
// § 36. 비교 섹션 숫자 포맷
// ═══════════════════════════════════════════════════════════════════
assert(goHome.includes("1,550"), "비교-포맷: 지하철 요금 1550원");
assert(goHome.includes("1,500"), "비교-포맷: 버스 요금 1500원");

// ═══════════════════════════════════════════════════════════════════
// § 37. 유효하지 않은 쿼리 처리 (no origin / no destination)
// ═══════════════════════════════════════════════════════════════════
const noDestU = "test-nodest";
await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }, noDestU);
const noDest = await getFastestRouteAction({ query: "어디 빨리 가야 해" }, route, noDestU);
assert(noDest.includes("알려주세요") || noDest.includes("어디"), "방어: 목적지 없을 때 질문");

// ═══════════════════════════════════════════════════════════════════
// § 38. 집 가는 길 / 회사 가는 길 패턴
// ═══════════════════════════════════════════════════════════════════
const goHomeRoute = await getFastestRouteAction({ query: "집 가는 길", currentLocation: "강남역 근처" }, route, U);
assert(goHomeRoute.includes("신림역"), "집가는길: 목적지 신림");

const goWorkRoute = await getFastestRouteAction({ query: "회사 가는 길", currentLocation: "신림역 근처" }, route, U);
assert(goWorkRoute.includes("강남역"), "회사가는길: 목적지 강남");

// ═══════════════════════════════════════════════════════════════════
// § 39. 응답 구조 완전성 검증 (모든 필수 섹션)
// ═══════════════════════════════════════════════════════════════════
assert(commute.includes("①"), "구조: 첫 번째 행동 스텝");
assert(commute.includes("②"), "구조: 두 번째 행동 스텝");
assert(commute.includes("③"), "구조: 세 번째 행동 스텝");
assert(commute.includes("지하철:"), "구조: 지하철 비교");
assert(commute.includes("버스("), "구조: 버스 비교");
assert(commute.includes("택시:"), "구조: 택시 비교");

// ═══════════════════════════════════════════════════════════════════
// § 40. good route 구조 완전성
// ═══════════════════════════════════════════════════════════════════
assert(romantic.includes("①"), "good구조: 첫 번째 행동");
assert(romantic.includes("②"), "good구조: 두 번째 행동");
assert(romantic.includes("③"), "good구조: 세 번째 행동");
assert(romantic.includes("코스:"), "good구조: 코스 컨셉");
assert(romantic.includes("우회:"), "good구조: 우회 정보");
assert(romantic.includes("시간 없으면"), "good구조: 대안 섹션");

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${"=".repeat(60)}`);
console.log(`결과: ${pass} PASS / ${fail} FAIL / ${pass + fail} TOTAL`);
console.log(`${"=".repeat(60)}`);
if (fail > 0) process.exit(1);
