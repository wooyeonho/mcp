import { MockPlaceProvider } from "../src/providers/mockPlaceProvider.js";
import { MockRouteProvider } from "../src/providers/mockRouteProvider.js";
import { getFastestRouteAction } from "../src/tools/getFastestRouteAction.js";
import { getGoodRoute } from "../src/tools/getGoodRoute.js";
import { saveUserPlaces } from "../src/tools/saveUserPlaces.js";

const route = new MockRouteProvider();
const place = new MockPlaceProvider();

const divider = (title: string) => console.log(`\n${"=".repeat(50)}\n[${title}]\n${"=".repeat(50)}`);

// 1. 장소 저장
divider("1. 장소 저장");
console.log(await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }));

// 2. 출근
divider("2. 출근");
console.log(await getFastestRouteAction({ query: "출근" }, route));

// 3. 퇴근
divider("3. 퇴근");
console.log(await getFastestRouteAction({ query: "퇴근" }, route));

// 4. 퇴근 낭만 (카페 우회)
divider("4. 퇴근 낭만");
console.log(await getGoodRoute({ query: "퇴근 낭만" }, route, place));

// 5. 회사에서 홍대입구 빨리
divider("5. 회사에서 홍대입구 빨리");
console.log(await getFastestRouteAction({ query: "회사에서 홍대입구 빨리" }, route));

// 6. 강남역 빨리 (출발지 질문 확인)
divider("6. 강남역 빨리 — 출발지 방어");
console.log(await getFastestRouteAction({ query: "강남역 빨리" }, route));

// 7. 집 가는 길 카페
divider("7. 집 가는 길 카페");
console.log(await getGoodRoute({ query: "집 가는 길 카페", currentLocation: "강남역 근처" }, route, place));

// 8. 20분만 돌아가는 산책길
divider("8. 20분만 돌아가는 산책길");
console.log(await getGoodRoute({ query: "퇴근 20분만 돌아가는 산책길", placeType: "walk" }, route, place));

// 9. 약속 늦었어 — recentDestination 활용
divider("9. 약속 늦었어 — 최근 목적지 자동 활용");
console.log(await getFastestRouteAction({ query: "약속 늦었어", currentLocation: "강남역 근처" }, route));

// 10. 약속 전에 혼밥
divider("10. 약속 전에 혼밥");
console.log(await getGoodRoute({ query: "회사에서 홍대입구 약속 전에 혼밥", placeType: "restaurant" }, route, place));

// 11. 비 오는데 퇴근 — 날씨 context
divider("11. 비 오는데 퇴근 — 날씨 context");
console.log(await getFastestRouteAction({ query: "비 오는데 퇴근" }, route));

// 12. 비 오는 날 퇴근 낭만 — 날씨 + 좋은 길
divider("12. 비 오는 날 퇴근 낭만 — 날씨 + 좋은 길");
console.log(await getGoodRoute({ query: "비 오는데 퇴근 낭만" }, route, place));

// 13. 약속 늦었어 (목적지 없이) — 목적지 질문 확인
divider("13. 약속 늦었어 (목적지 모름) — 목적지 질문");
// Reset profile to clear recentDestination for this test
await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" });
console.log(await getFastestRouteAction({ query: "약속 늦었어" }, route));

console.log("\n" + "=".repeat(50));
console.log("데모 완료: 13개 시나리오 실행 성공");
console.log("=".repeat(50));
