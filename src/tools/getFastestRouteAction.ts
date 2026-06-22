import { z } from "zod";
import { askClarification } from "../core/clarification.js";
import { resolveIntent } from "../core/resolveIntent.js";
import { formatSeoulTime, parseKoreanArrivalTime } from "../core/timeParser.js";
import { estimateWalking, crossingSummary, realWalkMinutes } from "../core/walkingEstimator.js";
import { geocodePlace } from "../providers/kakaoLocalProvider.js";
import type { RouteProvider, WeatherContext } from "../providers/types.js";
import { getProfile, rememberDestination } from "../storage/profileStore.js";

export const fastestSchema = {
  query: z.string(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  arrivalBy: z.string().optional(),
  includeTaxi: z.boolean().optional(),
  currentLocation: z.string().optional(),
};

type WeatherFn = () => Promise<WeatherContext>;

function kakaoMapLink(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
}

function kakaoNaviLink(destName: string, destLat: number, destLng: number): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(destName)},${destLat},${destLng}`;
}

export async function getFastestRouteAction(
  input: z.infer<z.ZodObject<typeof fastestSchema>>,
  routeProvider: RouteProvider,
  userId: string,
  fetchWeather?: WeatherFn,
): Promise<string> {
  try {
    const profile = getProfile(userId);
    const intent = resolveIntent(input.query, profile, {
      origin: input.origin ?? input.currentLocation,
      destination: input.destination,
      arrivalBy: input.arrivalBy ? parseKoreanArrivalTime(input.arrivalBy) : undefined,
    });
    if (intent.needs) return askClarification(intent.needs, input.query.includes("퇴근") ? "퇴근길" : undefined);

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

    const options = await routeProvider.getRouteOptions({
      origin: intent.origin!,
      destination: intent.destination!,
      includeTaxi: input.includeTaxi,
      arrivalBy: intent.arrivalBy,
      weather: weather ?? intent.weather,
    });
    rememberDestination(intent.destination!, userId);

    // Geocode destination for deep links (uses known coords if available, else Kakao API)
    const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
    const destCoords =
      options.find((o) => o.destCoords)?.destCoords ??
      (await geocodePlace(intent.destination!, KAKAO_KEY));

    const practical = options.find((o) => o.mode === "subway") ?? options[0];
    const walk = estimateWalking(practical.firstWalkMinutes);
    const toStopCrossings = practical.crossingsToStop ?? 0;
    const fromStopCrossings = practical.crossingsFromStop ?? 0;
    const realFirstWalk = realWalkMinutes(practical.firstWalkMinutes, toStopCrossings);
    const realLastWalk = realWalkMinutes(practical.lastWalkMinutes, fromStopCrossings);
    const totalRealMinutes = Math.round(realFirstWalk + practical.durationMinutes + realLastWalk);
    const arrival = new Date(Date.now() + totalRealMinutes * 60000);
    const bus = options.find((o) => o.mode === "bus");
    const taxi = options.find((o) => o.mode === "taxi");
    const fastestOption = [...options].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];

    const lines: string[] = [];

    const minutesLeft = intent.arrivalBy
      ? Math.round((intent.arrivalBy.getTime() - Date.now()) / 60000)
      : null;
    const isTight = minutesLeft !== null && minutesLeft < fastestOption.durationMinutes + 10;
    const isLate = intent.urgent || (minutesLeft !== null && minutesLeft < fastestOption.durationMinutes);

    // Auto weather note (real-time, only if not user-specified)
    if (autoWeatherNote) {
      lines.push(autoWeatherNote);
      lines.push("");
    }

    // Weather prefix
    const effectiveWeather = weather ?? intent.weather;
    if (effectiveWeather === "rain") {
      lines.push("비 오는 날입니다. 도보 시간 +2분, 택시 대기 길어질 수 있습니다.");
      lines.push("");
    } else if (effectiveWeather === "snow") {
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
      if (toStopCrossings > 0) {
        lines.push(`${practical.boardAt}까지 도보 ${walk.normal}분 + 횡단보도 ${toStopCrossings}곳 대기 = 실제 약 ${Math.ceil(realFirstWalk)}분. ${formatSeoulTime(arrival)} 도착 가능합니다.`);
      } else {
        lines.push(`${walk.normal}분 안에 도착하면 ${formatSeoulTime(arrival)} 도착 가능합니다.`);
      }
    }
    lines.push("");

    // 2. 지금 할 행동
    lines.push("지금 할 행동:");
    if (isLate && taxi) {
      lines.push(`① ${taxi.boardAt}에서 택시 잡기`);
      lines.push(`② "${intent.destination}" 말하고 탑승`);
      lines.push(`③ ${taxi.durationMinutes}분 뒤 도착`);
    } else {
      if (toStopCrossings > 0) {
        lines.push(`① ${practical.boardAt}까지 걸어가기 (도보 ${walk.normal}분 + 횡단보도 ${toStopCrossings}곳 = 실제 약 ${Math.ceil(realFirstWalk)}분)`);
      } else {
        lines.push(`① ${practical.boardAt}까지 걸어가기 (보통 ${walk.normal}분 / 빠른 걸음 ${walk.fast}분)`);
      }
      if (practical.line) {
        lines.push(`② ${practical.line} ${practical.direction ?? ""} 탑승`);
      } else if (practical.busNumber) {
        lines.push(`② ${practical.busNumber} 탑승`);
      }
      if (fromStopCrossings > 0) {
        lines.push(`③ ${practical.alightAt} 하차 → 도보 ${practical.lastWalkMinutes}분 + 횡단보도 ${fromStopCrossings}곳 = 실제 약 ${Math.ceil(realLastWalk)}분`);
      } else {
        lines.push(`③ ${practical.alightAt} 하차 → 도보 ${practical.lastWalkMinutes}분`);
      }
    }
    lines.push("");

    // 현실 총 소요시간
    const crossingInfo = crossingSummary(toStopCrossings, fromStopCrossings);
    if (crossingInfo && !(isLate && taxi)) {
      lines.push(crossingInfo);
      lines.push(`현실 총 소요시간: 약 ${totalRealMinutes}분 (도보 + 횡단보도 대기 + 탑승 포함)`);
      lines.push("");
    }

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

    // 4. 카카오 바로 이동 링크
    if (destCoords) {
      lines.push("");
      lines.push("카카오 바로 이동:");
      lines.push(`- 카카오맵 길찾기: ${kakaoNaviLink(intent.destination!, destCoords.lat, destCoords.lng)}`);
      if (taxi) {
        lines.push(`- 카카오T 택시: https://t.kakao.com/`);
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
