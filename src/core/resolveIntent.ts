import type { PlaceType, WeatherContext } from "../providers/types.js";
import type { UserProfile } from "../storage/profileStore.js";
import { parseKoreanArrivalTime } from "./timeParser.js";

export type IntentKind = "fastest" | "good_route";
export interface RouteIntent {
  kind: IntentKind;
  query: string;
  origin?: string;
  destination?: string;
  arrivalBy?: Date;
  mood?: string;
  placeType?: PlaceType;
  maxExtraMinutes?: number;
  weather?: WeatherContext;
  urgent?: boolean;
  needs?: "homeWork" | "home" | "work" | "origin" | "destination";
}

const goodWords = ["낭만", "카페", "산책", "혼밥", "밥", "디저트", "분위기", "좋은 길", "덜 걷", "돌아가는", "약속 전에"];
const urgentWords = ["늦었", "급해", "급하", "지금 당장", "서둘러"];
const rainWords = ["비", "우산", "비오", "비 오", "장마"];
const snowWords = ["눈", "눈 오"];

function cleanPlace(s: string) { return s.replace(/(빨리|최단|몇 시까지|까지|가줘|가는 길|가자|요)$/g, "").trim(); }
function aliasToAddress(value: string, profile: UserProfile): string | undefined {
  if (value === "집") return profile.home;
  if (value === "회사") return profile.work;
  return profile.aliases.find((a) => a.name === value)?.address;
}

function detectWeather(query: string): WeatherContext | undefined {
  if (rainWords.some((w) => query.includes(w))) return "rain";
  if (snowWords.some((w) => query.includes(w))) return "snow";
  return undefined;
}

export function fillFromProfile(intent: RouteIntent, profile: UserProfile): RouteIntent {
  const out = { ...intent };
  if (out.origin) out.origin = aliasToAddress(out.origin, profile) ?? out.origin;
  if (out.destination) out.destination = aliasToAddress(out.destination, profile) ?? out.destination;
  return out;
}

export function resolveIntent(query: string, profile: UserProfile, explicit: Partial<RouteIntent> = {}): RouteIntent {
  const kind: IntentKind = goodWords.some((w) => query.includes(w)) ? "good_route" : "fastest";
  let intent: RouteIntent = { kind, query, ...explicit };

  // Weather context from query
  intent.weather = intent.weather ?? detectWeather(query);

  // Urgency detection
  intent.urgent = urgentWords.some((w) => query.includes(w));

  // Mood / place type detection
  if (query.includes("낭만")) intent.mood = intent.mood ?? "romantic";
  if (query.includes("카페")) intent.placeType = intent.placeType ?? "cafe";
  if (query.includes("혼밥") || query.includes("밥")) intent.placeType = intent.placeType ?? "restaurant";
  if (query.includes("산책")) intent.placeType = intent.placeType ?? "walk";
  if (query.includes("디저트")) intent.placeType = intent.placeType ?? "dessert";
  const extra = query.match(/(\d{1,3})분만?\s*돌/); if (extra) intent.maxExtraMinutes = Number(extra[1]);
  intent.arrivalBy = intent.arrivalBy ?? parseKoreanArrivalTime(explicit.arrivalBy?.toString() ?? query);

  // Commute patterns — support "비 오는데 퇴근" etc.
  const stripped = query.replace(/^(비\s*오는데?\s*|눈\s*오는데?\s*|비\s*올\s*때\s*)/, "");
  if (/^출근/.test(stripped)) intent = { ...intent, origin: profile.home, destination: profile.work, needs: !profile.home || !profile.work ? "homeWork" : undefined };
  else if (/^퇴근/.test(stripped)) intent = { ...intent, origin: profile.work, destination: profile.home, needs: !profile.home || !profile.work ? "homeWork" : undefined };

  // "OO에서 OO 빨리/카페/..." pattern
  const fromTo = query.match(/(.+?)에서\s+(.+?)(?:\s|$)(?:빨리|최단|카페|낭만|산책|까지|$)/);
  if (fromTo) {
    intent.origin = explicit.origin ?? cleanPlace(fromTo[1]);
    intent.destination = explicit.destination ?? cleanPlace(fromTo[2]);
  }

  // "집 가는 길" pattern
  const asksHomeRoute = query.includes("집 가는 길") || query.includes("집가는 길");
  if (asksHomeRoute) {
    intent.destination = explicit.destination ?? profile.home;
    if (!profile.home && !explicit.destination) intent.needs = "home";
  }

  // "OO 빨리" short pattern
  const shortFast = query.match(/^(.+?)\s+(?:빨리|최단)$/);
  if (!intent.destination && shortFast) intent.destination = cleanPlace(shortFast[1]);

  // "약속 늦었어" / "늦었어" — use recentDestination if available
  if (/늦었/.test(query) && !intent.destination) {
    if (profile.recentDestination) {
      intent.destination = profile.recentDestination;
    }
  }

  intent = fillFromProfile(intent, profile);

  if (!intent.needs) {
    if (!intent.destination) intent.needs = "destination";
    else if (!intent.origin) intent.needs = "origin";
  }
  return intent;
}
