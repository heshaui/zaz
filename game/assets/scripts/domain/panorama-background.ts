const TARGET_ASPECT_RATIO = 2;
const MAX_ASPECT_RATIO_ERROR = 0.01;

export interface PortraitBackdropOptions {
  distance: number;
  imageAspectRatio: number;
  verticalFovDegrees: number;
  viewportAspectRatio: number;
}

export interface PortraitBackdropDimensions {
  width: number;
  height: number;
}

export function panoramaHorizontalOffsetToYawDegrees(horizontalOffset: number): number {
  return horizontalOffset * 360;
}

export function getPortraitBackdropDimensions(
  options: PortraitBackdropOptions,
): PortraitBackdropDimensions {
  const visibleHeight = 2
    * options.distance
    * Math.tan(options.verticalFovDegrees * Math.PI / 360);
  const visibleWidth = visibleHeight * options.viewportAspectRatio;

  if (options.imageAspectRatio >= options.viewportAspectRatio) {
    return {
      width: visibleHeight * options.imageAspectRatio,
      height: visibleHeight,
    };
  }
  return {
    width: visibleWidth,
    height: visibleWidth / options.imageAspectRatio,
  };
}

export function getPortraitBackdropUvs(): number[] {
  return [
    0, 1,
    0, 0,
    1, 0,
    1, 1,
  ];
}

export function isUsableEquirectangularPanorama(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }
  return Math.abs(width / height - TARGET_ASPECT_RATIO) <= MAX_ASPECT_RATIO_ERROR;
}
