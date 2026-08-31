export interface MachineViewBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

export interface MachineCameraPlacement {
  position: CameraPosition;
  rotationX: number;
  rotationY: number;
}

export interface MachineCameraPlacements {
  front: MachineCameraPlacement;
  side: MachineCameraPlacement;
}

export interface CameraFramingOptions {
  bounds: MachineViewBounds;
  verticalFov: number;
  aspectRatio: number;
  margin: number;
  elevationDegrees: number;
}

export type MachineCameraView = 'front' | 'side';
export type MachineCameraMode = 'home' | 'play';

export function getMachineCameraMargin(mode: MachineCameraMode): number {
  return mode === 'home' ? 1.16 : 1.08;
}

export function toggleMachineCameraView(current: MachineCameraView): MachineCameraView {
  return current === 'front' ? 'side' : 'front';
}

export const PROTOTYPE_MACHINE_VIEW_BOUNDS: Readonly<MachineViewBounds> = {
  minX: -2.33,
  maxX: 2.33,
  minY: 0,
  maxY: 5.73,
  minZ: -1.78,
  maxZ: 2.15,
};

export function createMachineCameraPlacements(
  options: CameraFramingOptions,
): MachineCameraPlacements {
  validateBounds(options.bounds);
  validateOptions(options);

  const { bounds } = options;
  const tangent = Math.tan(toRadians(options.verticalFov / 2));
  const halfWidth = (bounds.maxX - bounds.minX) / 2;
  const halfHeight = (bounds.maxY - bounds.minY) / 2;
  const halfDepth = (bounds.maxZ - bounds.minZ) / 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const verticalDistance = halfHeight * options.margin / tangent;
  const frontDistance = Math.max(
    verticalDistance,
    halfWidth * options.margin / (tangent * options.aspectRatio),
  );
  const sideDistance = Math.max(
    verticalDistance,
    halfDepth * options.margin / (tangent * options.aspectRatio),
  );
  const frontZ = bounds.maxZ + frontDistance;
  const sideX = bounds.maxX + sideDistance;
  const elevationTangent = Math.tan(toRadians(options.elevationDegrees));

  // 相机保持轻微俯视，并以机柜中心为观察目标；距离由较严格的水平或垂直边界决定。
  return {
    front: {
      position: {
        x: centerX,
        y: centerY + (frontZ - centerZ) * elevationTangent,
        z: frontZ,
      },
      rotationX: -options.elevationDegrees,
      rotationY: 0,
    },
    side: {
      position: {
        x: sideX,
        y: centerY + (sideX - centerX) * elevationTangent,
        z: centerZ,
      },
      rotationX: -options.elevationDegrees,
      rotationY: 90,
    },
  };
}

function validateBounds(bounds: MachineViewBounds): void {
  const values = [
    bounds.minX,
    bounds.maxX,
    bounds.minY,
    bounds.maxY,
    bounds.minZ,
    bounds.maxZ,
  ];
  if (
    !values.every(Number.isFinite)
    || bounds.minX >= bounds.maxX
    || bounds.minY >= bounds.maxY
    || bounds.minZ >= bounds.maxZ
  ) {
    throw new Error('invalid machine view bounds');
  }
}

function validateOptions(options: CameraFramingOptions): void {
  if (
    !Number.isFinite(options.verticalFov)
    || options.verticalFov <= 0
    || options.verticalFov >= 180
    || !Number.isFinite(options.aspectRatio)
    || options.aspectRatio <= 0
    || !Number.isFinite(options.margin)
    || options.margin < 1
    || !Number.isFinite(options.elevationDegrees)
    || options.elevationDegrees < 0
    || options.elevationDegrees >= 45
  ) {
    throw new Error('invalid camera framing options');
  }
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}
