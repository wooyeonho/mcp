const AVG_CROSSING_WAIT_SEC = 40;

export function estimateWalking(normalMinutes: number) {
  return { normal: normalMinutes, fast: Math.max(1, Math.round(normalMinutes * 0.75)), lightRun: Math.max(1, Math.round(normalMinutes * 0.55)) };
}

export function crossingWaitMinutes(crossings: number): number {
  if (crossings <= 0) return 0;
  return Math.round((crossings * AVG_CROSSING_WAIT_SEC) / 60 * 10) / 10;
}

export function realWalkMinutes(walkMinutes: number, crossings: number): number {
  return Math.round((walkMinutes + crossingWaitMinutes(crossings)) * 10) / 10;
}

export function crossingSummary(crossingsToStop: number, crossingsFromStop: number): string | undefined {
  const total = crossingsToStop + crossingsFromStop;
  if (total <= 0) return undefined;
  const parts: string[] = [];
  if (crossingsToStop > 0) parts.push(`출발 쪽 ${crossingsToStop}곳`);
  if (crossingsFromStop > 0) parts.push(`도착 쪽 ${crossingsFromStop}곳`);
  return `횡단보도 ${total}곳 (${parts.join(", ")}, 대기 약 ${Math.round(total * AVG_CROSSING_WAIT_SEC / 60)}분 포함)`;
}
