const TARGET_ASPECT_RATIO = 2;
const MAX_ASPECT_RATIO_ERROR = 0.01;

export function panoramaHorizontalOffsetToYawDegrees(horizontalOffset: number): number {
  return horizontalOffset * 360;
}

export function isUsableEquirectangularPanorama(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }
  return Math.abs(width / height - TARGET_ASPECT_RATIO) <= MAX_ASPECT_RATIO_ERROR;
}
