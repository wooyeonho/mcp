import { MockPlaceProvider } from "../src/providers/mockPlaceProvider.js";
import { MockRouteProvider } from "../src/providers/mockRouteProvider.js";
import { getFastestRouteAction } from "../src/tools/getFastestRouteAction.js";
import { getGoodRoute } from "../src/tools/getGoodRoute.js";
import { saveUserPlaces } from "../src/tools/saveUserPlaces.js";

const route = new MockRouteProvider();
const place = new MockPlaceProvider();
console.log(await saveUserPlaces({ home: "신림역 근처", work: "강남역 근처" }));
console.log("--- 퇴근 ---");
console.log(await getFastestRouteAction({ query: "퇴근" }, route));
console.log("--- 강남역 빨리 ---");
console.log(await getFastestRouteAction({ query: "강남역 빨리" }, route));
console.log("--- 퇴근 낭만 ---");
console.log(await getGoodRoute({ query: "퇴근 낭만" }, route, place));
const scenarios = [
  ["출근", () => getFastestRouteAction({ query: "출근" }, route)],
  ["회사에서 홍대입구 빨리", () => getFastestRouteAction({ query: "회사에서 홍대입구 빨리" }, route)],
  ["집에서 병원 3시까지", () => getFastestRouteAction({ query: "집에서 병원 3시까지" }, route)],
  ["집 가는 길 카페", () => getGoodRoute({ query: "집 가는 길 카페", origin: "강남역 근처" }, route, place)],
  ["20분만 돌아가는 산책길", () => getGoodRoute({ query: "20분만 돌아가는 산책길", origin: "강남역 근처", destination: "신림역 근처" }, route, place)],
  ["약속 전에 혼밥", () => getGoodRoute({ query: "약속 전에 혼밥", origin: "강남역 근처", destination: "홍대입구" }, route, place)],
  ["비 오는데 퇴근", () => getFastestRouteAction({ query: "비 오는데 퇴근" }, route)],
  ["약속 늦었어", () => getFastestRouteAction({ query: "약속 늦었어" }, route)]
] as const;
for (const [label, run] of scenarios) {
  console.log(`--- ${label} ---`);
  console.log(await run());
}
