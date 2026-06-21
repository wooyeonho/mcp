export function parseKoreanArrivalTime(text?: string, now = new Date()): Date | undefined {
  if (!text) return undefined;
  const match = text.match(/(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?(?:까지)?/);
  if (!match) return undefined;
  const meridiem = match[1];
  let hour = Number(match[2]);
  const minute = Number(match[3] ?? 0);
  if (meridiem === "오후" && hour < 12) hour += 12;
  if (meridiem === "오전" && hour === 12) hour = 0;
  const seoulNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const candidate = new Date(seoulNow);
  candidate.setHours(hour, minute, 0, 0);
  if (!meridiem && candidate <= seoulNow) candidate.setDate(candidate.getDate() + 1);
  if (meridiem && candidate <= seoulNow) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}
export function formatSeoulTime(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
