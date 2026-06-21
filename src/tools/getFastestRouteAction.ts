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

    const options = await routeProvider.getRouteOptions({ origin: intent.origin!, destination: intent.destination!, includeTaxi: input.includeTaxi, arrivalBy: intent.arrivalBy, weather: intent.weather });
    rememberDestination(intent.destination!);

    const practical = options.find((o) => o.mode === "subway") ?? options[0];
    const walk = estimateWalking(practical.firstWalkMinutes);
    const arrival = new Date(Date.now() + practical.durationMinutes * 60000);
    const bus = options.find((o) => o.mode === "bus");
    const taxi = options.find((o) => o.mode === "taxi");
    const fastestOption = [...options].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];

    const lines: string[] = [];

    // Urgency check — if arrivalBy is tight or user says "늦었어"
    const minutesLeft = intent.arrivalBy ? Math.round((intent.arrivalBy.getTime() - Date.now()) / 60000) : null;
    const isTight = minutesLeft !== null && minutesLeft < fastestOption.durationMinutes + 10;
    const isLate = intent.urgent || (minutesLeft !== null && minutesLeft < fastestOption.durationMinutes);

    // Weather prefix
    if (intent.weather === "rain") {
      lines.push("비 오는 날입니다. 도보 시간 +2분, 택시 대기 길어질 수 있습니다.");
      lines.push("");
    } else if (intent.weather === "snow") {
      lines.push("눈 오는 날입니다. 도로 정체, 도보 미끄럼 주의하세요.");
      lines.push("");
    }

    // 1. 결론
    if (isLate && taxi) {
      lines.push(`늦었습니다. 지금 바로 택시 타세요. ${taxi.boardAt}에서 잡으면 ${taxi.durationMinutes}분, 약 ${taxi.taxiFareKrw?.toLocaleString("ko-KR")}원입니다.`);
    } else if (isTight && taxi) {
      lines.push(`빠듯합니다. ${practical.boardAt} 쪽으로 빠른 걸음으로 걸어가세요.`);
      lines.push(`${walk.fast}분 안에 도착하면 ${formatSeoulTime(arrival)} 도착 가능합니다. 못 맞추면 택시로 전환하세요.`);
    } else {
      lines.push(`지금 바로 ${practical.boardAt} 쪽으로 걸어가세요.`);
      lines.push(`${walk.normal}분 안에 도착하면 ${formatSeoulTime(arrival)} 도착 가능합니다.`);
    }
    lines.push("");

    // 2. 지금 할 행동
    lines.push("지금 할 행동:");
    if (isLate && taxi) {
      lines.push(`① ${taxi.boardAt}에서 택시 잡기`);
      lines.push(`② "${intent.destination}" 말하고 탑승`);
      lines.push(`③ ${taxi.durationMinutes}분 뒤 도착`);
    } else {
      lines.push(`① ${practical.boardAt}까지 걸어가기 (보통 ${walk.normal}분 / 빠른 걸음 ${walk.fast}분)`);
      if (practical.line) {
        lines.push(`② ${practical.line} ${practical.direction ?? ""} 탑승`);
      } else if (practical.busNumber) {
        lines.push(`② ${practical.busNumber} 탑승`);
      }
      lines.push(`③ ${practical.alightAt} 하차 → 도보 ${practical.lastWalkMinutes}분`);
    }
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
    if (isLate && taxi) {
      lines.push("택시가 안 잡히면 카카오T 호출하세요. 도보로 가까운 큰 길에서 잡는 게 빠릅니다.");
    } else {
      lines.push(practical.missedFallback ?? "다음 대안으로 바로 전환하세요.");
      if (taxi && fastestOption.mode !== "taxi") {
        lines.push(`급하면 택시로 전환하세요. ${taxi.durationMinutes}분, 약 ${taxi.taxiFareKrw?.toLocaleString("ko-KR")}원입니다.`);
      }
    }

    return lines.join("\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.error("fastest_route_error", msg);
    if (msg.includes("origin") || msg.includes("destination")) return "출발지와 목적지를 다시 한 번 알려주세요.";
    if (msg.includes("provider") || msg.includes("network")) return "경로 조회 중 문제가 생겼습니다. 잠시 뒤 다시 시도해주세요.";
    return "예상 기준으로 안내할게요. 출발지와 목적지를 다시 한 번 알려주세요.";
  }
}
