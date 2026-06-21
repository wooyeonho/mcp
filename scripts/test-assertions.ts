import { MockPlaceProvider } from "../src/providers/mockPlaceProvider.js";
import { MockRouteProvider } from "../src/providers/mockRouteProvider.js";
import { getFastestRouteAction } from "../src/tools/getFastestRouteAction.js";
import { getGoodRoute } from "../src/tools/getGoodRoute.js";
import { saveUserPlaces } from "../src/tools/saveUserPlaces.js";

const route = new MockRouteProvider();
const place = new MockPlaceProvider();
const U = "test-user-main";

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string) {
  if (condition) { pass++; console.log(`PASS: ${label}`); }
  else { fail++; console.error(`FAIL: ${label}`); }
}

// Setup
await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }, U);

// === 출근 ===
const commute = await getFastestRouteAction({ query: "출근" }, route, U);
assert(commute.includes("신림역"), "출근: origin 신림");
assert(commute.includes("강남역"), "출근: dest 강남");
assert(commute.includes("지금 할 행동"), "출근: 행동 섹션");
assert(commute.includes("비교"), "출근: 비교 섹션");
assert(commute.includes("놓치면"), "출근: 놓치면 섹션");
assert(commute.includes("2호선"), "출근: 2호선");

// === 퇴근 ===
const goHome = await getFastestRouteAction({ query: "퇴근" }, route, U);
assert(goHome.includes("강남역"), "퇴근: origin 강남");
assert(goHome.includes("신림역"), "퇴근: dest 신림");
assert(goHome.includes("38분"), "퇴근: 38분 지하철");
assert(goHome.includes("146번"), "퇴근: 146번 버스");
assert(goHome.includes("18,000"), "퇴근: 택시 요금");

// === 퇴근 낭만 ===
const romantic = await getGoodRoute({ query: "퇴근 낭만" }, route, place, U);
assert(romantic.includes("카페"), "퇴근 낭만: 카페 포함");
assert(romantic.includes("시간 없으면"), "퇴근 낭만: 대안 섹션");
assert(romantic.includes("코스:"), "퇴근 낭만: 코스 컨셉");

// === 회사에서 홍대입구 빨리 ===
const toHongdae = await getFastestRouteAction({ query: "회사에서 홍대입구 빨리" }, route, U);
assert(toHongdae.includes("강남역"), "홍대빨리: origin 강남");
assert(toHongdae.includes("홍대"), "홍대빨리: dest 홍대");
assert(toHongdae.includes("472번"), "홍대빨리: 472번 fixture");
assert(!toHongdae.includes("늦었습니다"), "홍대빨리: 빨리≠늦음 (urgency fix)");
assert(toHongdae.includes("지금 바로"), "홍대빨리: 정상 결론");

// === 강남역 빨리 — 출발지 방어 ===
const noOrigin = await getFastestRouteAction({ query: "강남역 빨리" }, route, U);
assert(noOrigin.includes("출발지"), "출발지방어: 출발지 질문");
assert(noOrigin.includes("알려주세요"), "출발지방어: 질문 톤");

// === 비 오는데 퇴근 — 날씨 context ===
const rainCommute = await getFastestRouteAction({ query: "비 오는데 퇴근" }, route, U);
assert(rainCommute.includes("비 오는 날"), "비퇴근: 날씨 프리픽스");
assert(rainCommute.includes("+2분"), "비퇴근: 도보 보정");
assert(rainCommute.includes("7분"), "비퇴근: 보정된 도보 시간 (5+2)");
assert(rainCommute.includes("미끄러우니"), "비퇴근: 미끄럼 경고");

// === 비 오는 날 퇴근 낭만 — 날씨 + 좋은 길 ===
const rainGood = await getGoodRoute({ query: "비 오는데 퇴근 낭만" }, route, place, U);
assert(rainGood.includes("실내 위주"), "비낭만: 실내 추천 프리픽스");
assert(rainGood.includes("카페"), "비낭만: 카페 추천 유지");

// === 약속 늦었어 — recentDestination 활용 ===
// recentDestination should be set from previous calls (신림역 근처 from 퇴근)
const lateAppt = await getFastestRouteAction({ query: "약속 늦었어", currentLocation: "강남역 근처" }, route, U);
assert(lateAppt.includes("늦었습니다"), "늦었어: 긴급 결론");
assert(lateAppt.includes("택시"), "늦었어: 택시 우선");
assert(lateAppt.includes("카카오T"), "늦었어: 카카오T 안내");
assert(!lateAppt.includes("알려주세요"), "늦었어: 질문 안 함 (recentDest 활용)");

// === 약속 늦었어 — 목적지 없이 (다른 유저) ===
const U2 = "test-user-no-recent";
await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }, U2);
const lateNoTarget = await getFastestRouteAction({ query: "약속 늦었어" }, route, U2);
assert(lateNoTarget.includes("알려주세요"), "늦었어(모름): 목적지 질문");

// === 산책길 ===
const walk = await getGoodRoute({ query: "퇴근 20분만 돌아가는 산책길", placeType: "walk" }, route, place, U);
assert(walk.includes("산책"), "산책: 산책 키워드");
assert(walk.includes("걸어"), "산책: 걸어가세요");

// === 혼밥 ===
const honbap = await getGoodRoute({ query: "회사에서 홍대입구 약속 전에 혼밥", placeType: "restaurant" }, route, place, U);
assert(honbap.includes("덮밥"), "혼밥: 덮밥 추천");
assert(honbap.includes("홍대"), "혼밥: 홍대 목적지");

// === 집 가는 길 카페 ===
const homeCafe = await getGoodRoute({ query: "집 가는 길 카페", currentLocation: "강남역 근처" }, route, place, U);
assert(homeCafe.includes("카페"), "집카페: 카페 포함");
assert(homeCafe.includes("신림"), "집카페: 신림 방향");

// === Fixture diversity ===
const gangnam2Sinrim = await getFastestRouteAction({ query: "퇴근" }, route, U);
assert(gangnam2Sinrim.includes("146번"), "fixture: 강남→신림 = 146번");

const sinrim2Gangnam = await getFastestRouteAction({ query: "출근" }, route, U);
assert(sinrim2Gangnam.includes("5008번"), "fixture: 신림→강남 = 5008번");

// === 멀티유저 격리 테스트 ===
const U3 = "test-user-isolated";
await saveUserPlaces({ home: "홍대역 근처", work: "합정역 근처" }, U3);
const u1Profile = await getFastestRouteAction({ query: "퇴근" }, route, U);
const u3Profile = await getFastestRouteAction({ query: "퇴근" }, route, U3);
assert(u1Profile.includes("강남역"), "멀티유저: U1은 강남역 출발");
assert(u3Profile.includes("합정역"), "멀티유저: U3은 합정역 출발");
assert(!u1Profile.includes("합정역"), "멀티유저: U1에 합정역 안 섞임");

console.log(`\n${"=".repeat(50)}`);
console.log(`결과: ${pass} PASS / ${fail} FAIL / ${pass + fail} TOTAL`);
console.log(`${"=".repeat(50)}`);
if (fail > 0) process.exit(1);
