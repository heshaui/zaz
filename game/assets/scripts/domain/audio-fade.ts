export function moveAudioGainTowards(
  current: number,
  target: number,
  deltaSeconds: number,
  gainPerSecond: number,
): number {
  const distance = Math.max(0, deltaSeconds) * Math.max(0, gainPerSecond);
  if (current < target) return Math.min(target, current + distance);
  if (current > target) return Math.max(target, current - distance);
  return target;
}
