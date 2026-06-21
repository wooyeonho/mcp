import { z } from "zod";
import { askClarification } from "../core/clarification.js";
import { resolveIntent } from "../core/resolveIntent.js";
import { formatSeoulTime, parseKoreanArrivalTime } from "../core/timeParser.js";
import { estimateWalking } from "../core/walkingEstimator.js";
import type { RouteProvider } from "../providers/types.js";
import { getProfile, rememberDestination } from "../storage/profileStore.js";

export const fastestSchema = { query: z.string(), origin: z.string().optional(), destination: z.string().optional(), arrivalBy: z.string().optional(), includeTaxi: z.boolean().optional(), currentLocation: z.string().optional() };

export async function getFastestRouteAction(input: z.infer<z.ZodObject<typeof fastestSchema>>, routeProvider: RouteProvider) {
  try {
    const profile = getProfile();
    const intent = resolveIntent(input.query, profile, { origin: input.origin ?? input.currentLocation, destination: input.destination, arrivalBy: input.arrivalBy ? parseKoreanArrivalTime(input.arrivalBy) : undefined });
    if (intent.needs) return askClarification(intent.needs, input.query.includes("퇴근") ? "퇴근길" : undefined);

    const options = await routeProvider.getRouteOptions({ origin: intent.origin!, destination: intent.destination!, includeTaxi: input.includeTaxi, arrivalBy: intent.arrivalBy });
    rememberDestination(intent.destination!);

    const practical = options.find((o) => o.mode === "subway") ?? options[0];
    const walk = estimateWalking(practical.firstWalkMinutes);
    const arrival = new Date(Date.now() + practical.durationMinutes * 60000);
    const bus = options.find((o) => o.mode === "bus");
    const taxi = options.find((o) => o.mode === "taxi");

    const fastestOption = [...options].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];

    const lines: string[] = [];

    // 1. 결론 — 한 문장으로 "지금 뭘 해야 하는지"
    lines.push(`지금 바로 ${practical.boardAt} 쪽으로 걸어가세요.`);
    lines.push(`${walk.normal}분 안에 도착하면 ${formatSeoulTime(arrival)} 도착 가능합니다.`);
    lines.push("");

    // 2. 지금 할 행동 — 구체적 스텝
    lines.push("지금 할 행동:");
    lines.push(`① ${practical.boardAt}까지 걸어가기 (보통 ${walk.normal}분 / 빠른 걸음 ${walk.fast}분)`);
    if (practical.line) {
      lines.push(`② ${practical.line} ${practical.direction ?? ""} 탑승`);
    } else if (practical.busNumber) {
      lines.push(`② ${practical.busNumber} 탑승`);
    }
    lines.push(`③ ${practical.alightAt} 하차 → 도보 ${practical.lastWalkMinutes}분`);
    lines.push("");

    // 비교
    lines.push("비교:");
    const subwayOpt = options.find((o) => o.mode === "subway");
    if (subwayOpt) lines.push(`- 지하철: ${subwayOpt.durationMinutes}분, ${subwayOpt.fareKrw?.toLocaleString("ko-KR")}원`);
    if (bus) lines.push(`- 버스(${bus.busNumber}): ${bus.durationMinutes}분, ${bus.fareKrw?.toLocaleString("ko-KR")}원`);
    if (taxi) lines.push(`- 택시: ${taxi.durationMinutes}분, 약 ${taxi.taxiFareKrw?.toLocaleString("ko-KR")}원`);
    lines.push("");

    // 3. 놓쳤을 때 대안
    lines.push("놓치면:");
    lines.push(practical.missedFallback ?? "다음 대안으로 바로 전환하세요.");
    if (taxi && fastestOption.mode !== "taxi") {
      lines.push(`급하면 택시로 전환하세요. ${taxi.durationMinutes}분, 약 ${taxi.taxiFareKrw?.toLocaleString("ko-KR")}원입니다.`);
    }

    return lines.join("\n");
  } catch (error) {
    console.error("fastest_route_error", error instanceof Error ? error.message : "unknown");
    return "예상 기준으로 안내할게요. 출발지와 목적지를 다시 한 번 알려주세요.";
  }
}
