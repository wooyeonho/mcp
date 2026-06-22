import { z } from "zod";
import { askClarification } from "../core/clarification.js";
import { resolveIntent } from "../core/resolveIntent.js";
import type { PlaceProvider, RouteProvider } from "../providers/types.js";
import { getProfile, rememberDestination } from "../storage/profileStore.js";
export const goodRouteSchema = { query: z.string(), origin: z.string().optional(), currentLocation: z.string().optional(), destination: z.string().optional(), mood: z.string().optional(), placeType: z.enum(["cafe", "restaurant", "walk", "dessert", "any"]).optional(), maxExtraMinutes: z.number().int().positive().optional() };
export async function getGoodRoute(input: z.infer<z.ZodObject<typeof goodRouteSchema>>, routeProvider: RouteProvider, placeProvider: PlaceProvider, userId?: string) {
  try {
    const profile = getProfile(userId);
    const intent = resolveIntent(input.query, profile, { origin: input.origin ?? input.currentLocation, destination: input.destination, mood: input.mood, placeType: input.placeType, maxExtraMinutes: input.maxExtraMinutes });
    if (intent.needs) return askClarification(intent.needs);
    const suggestion = await routeProvider.getGoodRoute({ origin: intent.origin!, destination: intent.destination!, mood: intent.mood, placeType: intent.placeType, maxExtraMinutes: intent.maxExtraMinutes });
    const places = await placeProvider.findAlongRoute(intent.origin!, intent.destination!, intent.placeType ?? "any");
    rememberDestination(intent.destination!, userId);
    const place = places[0] ?? { name: "실시간 확인 필요", type: intent.placeType ?? "any", note: "장소 데이터가 비어 있어 경로 컨셉만 안내", extraMinutes: 0 };
    return `오늘은 ${suggestion.concept}이 좋습니다.\n\n코스:\n${intent.origin} → ${suggestion.stopBy} → ${intent.destination}\n\n추천:\n- ${place.type}: ${place.name} (${place.note})\n- 우회: ${suggestion.detour}\n- 추가 소요: 약 ${suggestion.extraMinutesRange[0]}~${suggestion.extraMinutesRange[1]}분\n\n이유:\n${suggestion.reason}\n\n결론:\n${suggestion.finalAction}`;
  } catch (error) { console.error("good_route_error", error instanceof Error ? error.message : "unknown"); return "예상 기준으로 안내할게요. 실시간 장소 정보는 다시 확인이 필요하지만, 큰길보다 조용한 길로 짧게 우회하는 코스를 추천합니다."; }
}
