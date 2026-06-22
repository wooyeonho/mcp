export function estimateWalking(normalMinutes: number) {
  return { normal: normalMinutes, fast: Math.max(1, Math.round(normalMinutes * 0.75)), lightRun: Math.max(1, Math.round(normalMinutes * 0.55)) };
}

export function estimateWalkWithCrossings(normalMinutes: number, crossings = 0, waitSecondsPerCrossing = 40) {
  const waitSeconds = crossings * waitSecondsPerCrossing;
  const actualMinutes = Math.max(1, Math.ceil(normalMinutes + waitSeconds / 60));
  return { ...estimateWalking(normalMinutes), crossings, waitSeconds, actualMinutes };
}
