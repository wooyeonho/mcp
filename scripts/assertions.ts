import assert from "node:assert/strict";
import { resolveIntent } from "../src/core/resolveIntent.js";
import { parseKoreanArrivalTime } from "../src/core/timeParser.js";
import { estimateWalking } from "../src/core/walkingEstimator.js";
import { MockPlaceProvider } from "../src/providers/mockPlaceProvider.js";
import { MockRouteProvider } from "../src/providers/mockRouteProvider.js";
import { getFastestRouteAction } from "../src/tools/getFastestRouteAction.js";
import { getGoodRoute } from "../src/tools/getGoodRoute.js";
import { saveUserPlaces } from "../src/tools/saveUserPlaces.js";

let count = 0;
function check(name: string, condition: unknown) {
  assert.ok(condition, name);
  count += 1;
}
function includes(name: string, value: string, expected: string) {
  check(name, value.includes(expected));
}

const profile = { home: "신림역 근처", work: "강남역 근처", aliases: [] };
const route = new MockRouteProvider();
const place = new MockPlaceProvider();

const saved = await saveUserPlaces({ home: profile.home, work: profile.work });
includes("save confirms", saved, "저장했습니다");
includes("save suggests commute", saved, "출근");

const commute = resolveIntent("출근", profile);
check("출근 origin", commute.origin === profile.home);
check("출근 destination", commute.destination === profile.work);
const leave = resolveIntent("퇴근", profile);
check("퇴근 origin", leave.origin === profile.work);
check("퇴근 destination", leave.destination === profile.home);
const rainyLeave = resolveIntent("비 오는데 퇴근", profile);
check("rainy leave origin", rainyLeave.origin === profile.work);
check("rainy leave destination", rainyLeave.destination === profile.home);
check("rainy leave weather", rainyLeave.weather === "rain");
const romantic = resolveIntent("퇴근 낭만", profile);
check("romantic kind", romantic.kind === "good_route");
check("romantic mood", romantic.mood === "romantic");
const cafe = resolveIntent("집 가는 길 카페", profile);
check("cafe place type", cafe.placeType === "cafe");
check("home route destination", cafe.destination === profile.home);
const walk = resolveIntent("20분만 돌아가는 산책길", profile);
check("walk place type", walk.placeType === "walk");
check("walk extra", walk.maxExtraMinutes === 20);
const hurry = resolveIntent("강남역 빨리", profile);
check("short fast destination", hurry.destination === "강남역");
check("short fast needs origin", hurry.needs === "origin");
const late = resolveIntent("약속 늦었어", profile);
check("late asks destination", late.needs === "destination");

const parsed = parseKoreanArrivalTime("3시까지", new Date("2026-06-21T05:00:00.000Z"));
check("time parsed", parsed instanceof Date);
check("time future", parsed!.getTime() > new Date("2026-06-21T05:00:00.000Z").getTime());
const walking = estimateWalking(5);
check("walk normal", walking.normal === 5);
check("walk fast", walking.fast === 4);
check("walk run", walking.lightRun === 3);

const options = await route.getRouteOptions({ origin: profile.work, destination: profile.home, weather: "rain" });
check("three route options", options.length === 3);
check("subway fixture", options.some((o) => o.mode === "subway" && o.line === "2호선"));
check("bus fixture", options.some((o) => o.mode === "bus" && o.busNumber === "146번"));
check("taxi fixture", options.some((o) => o.mode === "taxi" && o.taxiFareKrw === 18000));
const places = await place.findAlongRoute(profile.work, profile.home, "restaurant");
check("restaurant place", places[0].type === "restaurant");
includes("restaurant note", places[0].note, "역");

const fastest = await getFastestRouteAction({ query: "퇴근" }, route);
includes("fastest conclusion", fastest, "결론");
includes("fastest action", fastest, "최종 행동");
includes("fastest missed", fastest, "놓치면");
includes("fastest subway", fastest, "2호선");
includes("fastest comparison", fastest, "비교");
const rainy = await getFastestRouteAction({ query: "비 오는데 퇴근" }, route);
includes("rainy response", rainy, "비 오는 날 기준");
const missingOrigin = await getFastestRouteAction({ query: "강남역 빨리" }, route);
includes("missing origin", missingOrigin, "출발지를 알려주세요");
const missingDestination = await getFastestRouteAction({ query: "약속 늦었어" }, route);
includes("missing destination", missingDestination, "어디까지");
const good = await getGoodRoute({ query: "퇴근 낭만" }, route, place);
includes("good route concept", good, "코스");
const food = await getGoodRoute({ query: "약속 전에 혼밥", origin: profile.work, destination: "홍대입구" }, route, place);
includes("food route", food, "restaurant");

check("exact assertion count", count === 39);
console.log(`${count} assertions passed`);
