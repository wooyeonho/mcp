import { z } from "zod";
import { askClarification } from "../core/clarification.js";
import { resolveIntent } from "../core/resolveIntent.js";
import { formatSeoulTime, parseKoreanArrivalTime } from "../core/timeParser.js";
import { estimateWalking } from "../core/walkingEstimator.js";
import type { RouteProvider } from "../providers/types.js";
import { getProfile, rememberDestination } from "../storage/profileStore.js";
export const fastestSchema = { query: z.string(), origin: z.string().optional(), destination: z.string().optional(), arrivalBy: z.string().optional(), includeTaxi: z.boolean().optional(), currentLocation: z.string().optional() };
export async function getFastestRouteAction(input: z.infer<z.ZodObject<typeof fastestSchema>>, routeProvider: RouteProvider, userId?: string) {
  try {
    const profile = getProfile(userId);
    const intent = resolveIntent(input.query, profile, { origin: input.origin ?? input.currentLocation, destination: input.destination, arrivalBy: input.arrivalBy ? parseKoreanArrivalTime(input.arrivalBy) : undefined });
    if (intent.needs) return askClarification(intent.needs, input.query.includes("퇴근") ? "퇴근길" : undefined);
    const options = await routeProvider.getRouteOptions({ origin: intent.origin!, destination: intent.destination!, includeTaxi: input.includeTaxi, arrivalBy: intent.arrivalBy, weather: intent.weather });
    rememberDestination(intent.destination!, userId);
    const practical = options.find((o) => o.mode === "subway") ?? options[0];
    const walk = estimateWalking(practical.firstWalkMinutes);
    const arrival = new Date(Date.now() + practical.durationMinutes * 60000);
    const bus = options.find((o) => o.mode === "bus"); const taxi = options.find((o) => o.mode === "taxi");
    const weatherNote = intent.weather === "rain"
      ? `\n\n비 오는 날 기준:\n- 첫 도보는 무리하지 말고 빠른 걸음까지만 추천합니다.\n- 택시가 바로 잡히면 비용을 감수할 때 가장 편합니다.`
      : "";
    return `결론: 지금은 ${practical.line ?? practical.busNumber ?? "추천 경로"} ${practical.mode === "subway" ? "지하철" : practical.mode === "bus" ? "버스" : "택시"}이 가장 좋습니다.\n\n1. ${practical.boardAt}까지 도보 ${walk.normal}분\n   - 빠른 걸음: 약 ${walk.fast}분\n   - 가볍게 뛰면: 약 ${walk.lightRun}분\n2. ${practical.line ? `${practical.line} 탑승 (${practical.direction})` : `${practical.busNumber} 탑승`}\n3. ${practical.alightAt} 하차\n4. 목적지까지 도보 ${practical.lastWalkMinutes}분\n\n예상 도착: ${formatSeoulTime(arrival)}\n\n비교:\n- 지하철: ${options.find((o) => o.mode === "subway")?.durationMinutes ?? "-"}분\n- 버스: ${bus?.durationMinutes ?? "-"}분${bus?.busNumber ? ` (${bus.busNumber})` : ""}\n- 택시: ${taxi?.durationMinutes ?? "-"}분${taxi?.taxiFareKrw ? `, 약 ${taxi.taxiFareKrw.toLocaleString("ko-KR")}원` : ""}${weatherNote}\n\n놓치면: ${practical.missedFallback ?? "다음 대안으로 바로 전환하세요."}\n\n최종 행동:\n최단은 택시지만 비용 대비로는 지하철이 좋습니다. 지금 ${practical.boardAt}로 이동하세요.`;
  } catch (error) { console.error("fastest_route_error", error instanceof Error ? error.message : "unknown"); return "예상 기준으로 안내할게요. 출발지와 목적지를 다시 한 번 알려주세요."; }
}
