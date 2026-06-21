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
console.log("--- 약속 늦었어 ---");
console.log(await getFastestRouteAction({ query: "약속 늦었어" }, route));
