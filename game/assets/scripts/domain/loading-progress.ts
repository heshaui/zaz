export interface LoadingProgressView {
  percent: number;
  litCount: number;
}

export function presentLoadingProgress(
  completed: number,
  total: number,
  lightCount: number,
): LoadingProgressView {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) {
    return { percent: 0, litCount: 0 };
  }

  const progress = Math.min(1, Math.max(0, completed) / total);
  const availableLights = Math.max(0, Math.floor(Number.isFinite(lightCount) ? lightCount : 0));
  return {
    percent: Math.round(progress * 100),
    litCount: Math.ceil(progress * availableLights),
  };
}
