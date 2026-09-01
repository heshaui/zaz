export interface LoadingProgressView {
  ratio: number;
  percent: number;
  litCount: number;
}

export interface LoadingBarGeometry {
  fillWidth: number;
  markerX: number;
}

export function calculateLoadingBarGeometry(
  ratio: number,
  trackWidth: number,
  markerRadius: number,
): LoadingBarGeometry {
  const width = Number.isFinite(trackWidth) ? Math.max(0, trackWidth) : 0;
  const radius = Number.isFinite(markerRadius)
    ? Math.min(width / 2, Math.max(0, markerRadius))
    : 0;
  const progress = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return {
    fillWidth: width * progress,
    markerX: width === 0 ? 0 : -width / 2 + radius + (width - radius * 2) * progress,
  };
}

export function calculateRemainingDisplayTime(elapsedMs: number, minimumMs: number): number {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const minimum = Number.isFinite(minimumMs) ? Math.max(0, minimumMs) : 0;
  return Math.max(0, minimum - elapsed);
}

export function presentLoadingProgress(
  completed: number,
  total: number,
  lightCount: number,
): LoadingProgressView {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) {
    return { ratio: 0, percent: 0, litCount: 0 };
  }

  const progress = Math.min(1, Math.max(0, completed) / total);
  const availableLights = Math.max(0, Math.floor(Number.isFinite(lightCount) ? lightCount : 0));
  return {
    ratio: progress,
    percent: Math.round(progress * 100),
    litCount: Math.ceil(progress * availableLights),
  };
}
