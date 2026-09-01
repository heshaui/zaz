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
  frontYawDegrees?: number;
}

export type MachineCameraView = 'front' | 'side';
export type MachineCameraMode = 'home' | 'play';

export interface MachineCameraProfile {
  margin: number;
  elevationDegrees: number;
  yawDegrees: number;
}

export function getMachineCameraProfile(mode: MachineCameraMode): MachineCameraProfile {
  return mode === 'home'
    ? { margin: 1.2, elevationDegrees: 13, yawDegrees: 18 }
    : { margin: 1.04, elevationDegrees: 18, yawDegrees: 0 };
}

export function getMachineCameraMargin(mode: MachineCameraMode): number {
  return getMachineCameraProfile(mode).margin;
}

export function toggleMachineCameraView(current: MachineCameraView): MachineCameraView {
  return current === 'front' ? 'side' : 'front';
}

export function selectMachineCameraPlacement(
  placements: MachineCameraPlacements,
  view: MachineCameraView,
): MachineCameraPlacement {
  return view === 'front' ? placements.front : placements.side;
}

export function interpolateMachineCameraPlacement(
  from: MachineCameraPlacement,
  to: MachineCameraPlacement,
  center: { x: number; z: number },
  ratio: number,
): MachineCameraPlacement {
  const fromRadius = Math.hypot(
    from.position.x - center.x,
    from.position.z - center.z,
  );
  const toRadius = Math.hypot(
    to.position.x - center.x,
    to.position.z - center.z,
  );
  const fromAngle = Math.atan2(
    from.position.x - center.x,
    from.position.z - center.z,
  );
  const toAngle = Math.atan2(
    to.position.x - center.x,
    to.position.z - center.z,
  );
  let angleDelta = toAngle - fromAngle;
  if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
  if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
  const angle = fromAngle + angleDelta * ratio;
  const radius = mix(fromRadius, toRadius, ratio);

  // 水平位置沿机柜中心走圆弧，避免直线插值在中点靠近机柜并产生放大感。
  return {
    position: {
      x: center.x + Math.sin(angle) * radius,
      y: mix(from.position.y, to.position.y, ratio),
      z: center.z + Math.cos(angle) * radius,
    },
    rotationX: mix(from.rotationX, to.rotationX, ratio),
    rotationY: angle * 180 / Math.PI,
  };
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
  const frontYawDegrees = options.frontYawDegrees ?? 0;
  const frontYawRadians = toRadians(frontYawDegrees);
  const frontRadius = frontZ - centerZ;
  const sideRadius = sideX - centerX;
  const orbitRadius = Math.max(frontRadius, sideRadius);

  // 侧前方展示时相机位置与朝向沿同一半径旋转，保证画面中心始终落在机柜中心。
  return {
    front: {
      position: {
        x: centerX + Math.sin(frontYawRadians) * orbitRadius,
        y: centerY + orbitRadius * elevationTangent,
        z: centerZ + Math.cos(frontYawRadians) * orbitRadius,
      },
      rotationX: -options.elevationDegrees,
      rotationY: frontYawDegrees,
    },
    side: {
      position: {
        x: centerX + orbitRadius,
        y: centerY + orbitRadius * elevationTangent,
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

function mix(from: number, to: number, ratio: number): number {
  return from + (to - from) * ratio;
}
