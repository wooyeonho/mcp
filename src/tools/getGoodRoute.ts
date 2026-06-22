import { z } from "zod";
import { askClarification } from "../core/clarification.js";
import { resolveIntent } from "../core/resolveIntent.js";
import { crossingSummary, realWalkMinutes } from "../core/walkingEstimator.js";
import { geocodePlace } from "../providers/kakaoLocalProvider.js";
import type { PlaceProvider, RouteProvider, WeatherContext } from "../providers/types.js";
import { getProfile, rememberDestination } from "../storage/profileStore.js";

export const goodRouteSchema = {
  query: z.string(),
  origin: z.string().optional(),
  currentLocation: z.string().optional(),
  destination: z.string().optional(),
  mood: z.string().optional(),
  placeType: z.enum(["cafe", "restaurant", "walk", "dessert", "any"]).optional(),
  maxExtraMinutes: z.number().int().positive().optional(),
};

type WeatherFn = () => Promise<WeatherContext>;

function kakaoSearchLink(keyword: string): string {
  return `https://map.kakao.com/link/search/${encodeURIComponent(keyword)}`;
}

export async function getGoodRoute(
  input: z.infer<z.ZodObject<typeof goodRouteSchema>>,
  routeProvider: RouteProvider,
  placeProvider: PlaceProvider,
  userId: string,
  fetchWeather?: WeatherFn,
): Promise<string> {
  try {
    const profile = getProfile(userId);
    const intent = resolveIntent(input.query, profile, {
      origin: input.origin ?? input.currentLocation,
      destination: input.destination,
      mood: input.mood,
      placeType: input.placeType,
      maxExtraMinutes: input.maxExtraMinutes,
    });
    if (intent.needs) return askClarification(intent.needs);

    // Auto-detect real Seoul weather if not mentioned in query
    let weather = intent.weather;
    let autoWeatherNote = "";
    if (!weather && fetchWeather) {
      weather = await fetchWeather();
      if (weather !== "clear") {
        autoWeatherNote = weather === "rain"
          ? "현재 서울 날씨: 비 오는 중입니다."
          : "현재 서울 날씨: 눈 오는 중입니다.";
      }
    }

    const [suggestion, places] = await Promise.all([
      routeProvider.getGoodRoute({
        origin: intent.origin!,
        destination: intent.destination!,
        mood: intent.mood,
        placeType: intent.placeType,
        maxExtraMinutes: intent.maxExtraMinutes,
      }),
      placeProvider.findAlongRoute(intent.origin!, intent.destination!, intent.placeType ?? "any"),
    ]);
    rememberDestination(intent.destination!, userId);

    const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
    const destCoords =
      await geocodePlace(intent.destination!, KAKAO_KEY);

    const place = places[0] ?? { name: "주변 추천 장소", note: "경로 근처 분위기 좋은 곳", extraMinutes: 5 };
    const lines: string[] = [];

    // Auto weather note
    if (autoWeatherNote) {
      lines.push(autoWeatherNote);
      lines.push("");
    }

    // Weather warning
    const effectiveWeather = weather ?? intent.weather;
    if (effectiveWeather === "rain") {
      lines.push("비 오는 날이지만 여유 있으니까요. 실내 위주로 추천합니다.");
      lines.push("");
    } else if (effectiveWeather === "snow") {
      lines.push("눈 오는 날입니다. 따뜻한 실내 코스 위주로 추천합니다.");
      lines.push("");
    }

    // 1. 결론
    lines.push(suggestion.finalAction);
    lines.push("");

    // 2. 지금 할 행동
    lines.push("지금 할 행동:");
    lines.push(`① ${suggestion.stopBy}`);
    lines.push(`② ${place.name} (${place.note})`);
    lines.push(`③ 추가 소요: 약 ${suggestion.extraMinutesRange[0]}~${suggestion.extraMinutesRange[1]}분`);
    lines.push("");

    // 코스 컨셉
    lines.push(`코스: ${suggestion.concept}`);
    lines.push(`우회: ${suggestion.detour}`);
    lines.push("");

    // 이유
    lines.push(suggestion.reason);
    lines.push("");

    // 횡단보도 정보
    const baseOptions = await routeProvider.getRouteOptions({ origin: intent.origin!, destination: intent.destination! });
    const baseRoute = baseOptions.find((o) => o.mode === "subway") ?? baseOptions[0];
    const toC = baseRoute?.crossingsToStop ?? 0;
    const fromC = baseRoute?.crossingsFromStop ?? 0;
    const crossingNote = crossingSummary(toC, fromC);
    if (baseRoute && crossingNote) {
      const realTotal = Math.round(
        realWalkMinutes(baseRoute.firstWalkMinutes, toC) +
        baseRoute.durationMinutes +
        realWalkMinutes(baseRoute.lastWalkMinutes, fromC),
      );
      lines.push(`참고: 직행 시 현실 소요시간 약 ${realTotal}분 (${crossingNote})`);
      lines.push("");
    }

    // 3. 대안
    lines.push("시간 없으면:");
    lines.push(`그냥 직행하세요. ${intent.origin} → ${intent.destination} 최단 경로로 가면 됩니다.`);
    if (places.length > 1) {
      lines.push(`또는 ${places[1].name}도 괜찮습니다. (${places[1].note}, +${places[1].extraMinutes}분)`);
    }

    // 4. 카카오 바로 이동 링크
    if (destCoords) {
      lines.push("");
      lines.push("카카오 바로 이동:");
      lines.push(`- 카카오맵 목적지: https://map.kakao.com/link/to/${encodeURIComponent(intent.destination!)},${destCoords.lat},${destCoords.lng}`);
      if ((intent.placeType === "cafe" || intent.placeType === "restaurant") && place.name) {
        lines.push(`- 카카오맵 장소 검색: ${kakaoSearchLink(place.name)}`);
      }
    }

    return lines.join("\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.error("good_route_error", msg);
    if (msg.includes("origin") || msg.includes("destination")) return "출발지와 목적지를 다시 한 번 알려주세요.";
    if (msg.includes("provider") || msg.includes("network")) return "경로 조회 중 문제가 생겼습니다. 잠시 뒤 다시 시도해주세요.";
    return "예상 기준으로 안내할게요. 큰길보다 조용한 길로 짧게 우회하는 코스를 추천합니다.";
  }
}
