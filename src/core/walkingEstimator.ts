export function estimateWalking(normalMinutes: number) {
  return { normal: normalMinutes, fast: Math.max(1, Math.round(normalMinutes * 0.75)), lightRun: Math.max(1, Math.round(normalMinutes * 0.55)) };
}
