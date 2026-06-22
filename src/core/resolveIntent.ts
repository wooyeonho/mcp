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

const goodWords = ["낭만", "카페", "산책", "혼밥", "밥 먹고", "밥 먹자", "밥", "디저트", "분위기", "좋은 길", "덜 걷", "돌아가는", "약속 전에", "들렀다", "들려서"];
const urgentWords = ["늦었", "급해", "급하", "지금 당장", "서둘러", "빨리빨리"];
const rainWords = ["비", "우산", "비오", "비 오", "장마", "우중충"];
const snowWords = ["눈 오", "눈오", "폭설", "눈길"];

function cleanPlace(s: string) {
  return s
    .replace(/(빨리|최단|몇 시까지|까지|가줘|가는 길|가자|가야 해|가야해|가고 싶어|어떻게 가|갈게요?|갑니다|가세요|요|야)$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasToAddress(value: string, profile: UserProfile): string | undefined {
  if (value === "집") return profile.home;
  if (value === "회사") return profile.work;
  return profile.aliases.find((a) => a.name === value)?.address;
}

function detectWeather(query: string): WeatherContext | undefined {
  if (snowWords.some((w) => query.includes(w))) return "snow";
  if (rainWords.some((w) => query.includes(w))) return "rain";
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

  intent.weather = intent.weather ?? detectWeather(query);
  intent.urgent = urgentWords.some((w) => query.includes(w));

  // Mood / place type
  if (query.includes("낭만")) intent.mood = intent.mood ?? "romantic";
  if (query.includes("카페") || query.includes("커피")) intent.placeType = intent.placeType ?? "cafe";
  if (query.includes("혼밥") || query.includes("밥 먹") || (query.includes("밥") && !query.includes("퇴근"))) intent.placeType = intent.placeType ?? "restaurant";
  if (query.includes("산책")) intent.placeType = intent.placeType ?? "walk";
  if (query.includes("디저트")) intent.placeType = intent.placeType ?? "dessert";

  // Extra minutes ("20분만 돌아" / "30분 여유")
  const extra = query.match(/(\d{1,3})분\s*만?\s*(?:돌아|우회|여유|산책)/);
  if (extra) intent.maxExtraMinutes = Number(extra[1]);

  // Arrival time from string ("3시까지", "오후 6시 30분까지")
  intent.arrivalBy = intent.arrivalBy ?? parseKoreanArrivalTime(explicit.arrivalBy?.toString() ?? query);

  // Strip weather prefix for commute detection
  const stripped = query.replace(/^(비\s*오는\s*(?:날|데)?\s*|눈\s*오는\s*(?:날|데)?\s*|비\s*올\s*때\s*|우중충한\s*날?\s*)/, "");

  // Commute shortcuts
  if (/^출근/.test(stripped)) {
    intent = { ...intent, origin: profile.home, destination: profile.work };
    if (!profile.home || !profile.work) intent.needs = "homeWork";
  } else if (/^퇴근/.test(stripped)) {
    intent = { ...intent, origin: profile.work, destination: profile.home };
    if (!profile.home || !profile.work) intent.needs = "homeWork";
  }

  // "OO에서 OO" pattern — supports trailing keyword or end of string
  const fromTo = query.match(/(.+?)에서\s+(.+?)(?:\s+(?:빨리|최단|카페|낭만|산책|까지|가줘|갈게)|$)/);
  if (fromTo) {
    if (!intent.origin) intent.origin = cleanPlace(fromTo[1]);
    if (!intent.destination) intent.destination = cleanPlace(fromTo[2]);
  }

  // "집 가는 길" / "집가는 길"
  if (query.includes("집 가는 길") || query.includes("집가는 길") || query.includes("집에 가야")) {
    intent.destination = explicit.destination ?? profile.home;
    if (!profile.home && !explicit.destination) intent.needs = "home";
  }

  // "회사 가야 해" / "회사 가는 길"
  if (query.includes("회사 가는 길") || query.includes("회사에 가야")) {
    intent.destination = explicit.destination ?? profile.work;
    if (!profile.work && !explicit.destination) intent.needs = "work";
  }

  // "OO 빨리" / "OO 최단" short pattern
  const shortFast = query.match(/^(.+?)\s+(?:빨리|최단)$/);
  if (!intent.destination && shortFast) intent.destination = cleanPlace(shortFast[1]);

  // "N시까지 OO" (time-first)
  const timeFirst = query.match(/(?:오전|오후)?\s*\d{1,2}시(?:\s*\d{1,2}분)?\s*까지\s+(.+)/);
  if (timeFirst && !intent.destination) intent.destination = cleanPlace(timeFirst[1]);

  // "OO N시까지" or "OO까지 N시"
  const destFirst = query.match(/^(.+?)\s+(?:오전|오후)?\s*\d{1,2}시(?:\s*\d{1,2}분)?\s*까지?$/);
  if (destFirst && !intent.destination) intent.destination = cleanPlace(destFirst[1]);

  // "OO 가야 해/돼" pattern
  const hasToGo = query.match(/^(.+?)(?:에\s*)?(?:가야\s*해|가야\s*돼|가야\s*함|갈게|가겠어|가야\s*합니다)$/);
  if (hasToGo && !intent.destination) intent.destination = cleanPlace(hasToGo[1]);

  // "OO 어떻게 가" pattern
  const howTo = query.match(/^(.+?)\s+어떻게\s*가/);
  if (howTo && !intent.destination) intent.destination = cleanPlace(howTo[1]);

  // "약속 늦었어" / "늦었어" — use recentDestination
  if (/늦었/.test(query) && !intent.destination && profile.recentDestination) {
    intent.destination = profile.recentDestination;
  }

  // Fill aliases from profile
  intent = fillFromProfile(intent, profile);

  // Determine what's still needed
  if (!intent.needs) {
    if (!intent.destination) intent.needs = "destination";
    else if (!intent.origin) intent.needs = "origin";
  }

  return intent;
}
