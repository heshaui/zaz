import {
  createRotatedDollBounds,
  type DollBounds3D,
} from './doll-layout';

export type GrabCyclePhase =
  | 'open-and-drop'
  | 'close'
  | 'lift-half'
  | 'lift-home'
  | 'release-midway'
  | 'return-to-chute'
  | 'open-over-chute'
  | 'deliver-prize'
  | 'park';

export interface GrabCycleOutcome {
  won: boolean;
  releaseAtHalf: boolean;
}

export interface HorizontalPoint {
  x: number;
  z: number;
}

export interface HorizontalArea {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WeakDropPlanOptions {
  origin: HorizontalPoint;
  bounds: HorizontalArea;
  blockedAreas: readonly HorizontalArea[];
  minOffset: number;
  maxOffset: number;
  seed: number;
  localBounds: DollBounds3D;
  startRotation: { x: number; y: number; z: number };
  scale: number;
  baseY: number;
}

export interface WeakDropPlan {
  landing: HorizontalPoint & { y: number };
  rotationDelta: {
    x: number;
    y: number;
    z: number;
  };
}

export function createGrabCycleTimeline(outcome: GrabCycleOutcome): GrabCyclePhase[] {
  const phases: GrabCyclePhase[] = ['open-and-drop', 'close'];
  if (outcome.releaseAtHalf) {
    phases.push('lift-half', 'release-midway', 'lift-home');
  } else {
    phases.push('lift-home');
  }
  phases.push('return-to-chute', 'open-over-chute');
  if (outcome.won) phases.push('deliver-prize');
  phases.push('park');
  return phases;
}

export function createWeakDropPlan(options: WeakDropPlanOptions): WeakDropPlan {
  validateWeakDropOptions(options);
  const random = createSeededRandom(options.seed);
  const offset = mix(options.minOffset, options.maxOffset, random());
  const startAngle = random() * Math.PI * 2;
  const xDirection = random() < 0.5 ? -1 : 1;
  const zDirection = random() < 0.5 ? -1 : 1;
  const rotationDelta = {
    x: xDirection * mix(55, 105, random()),
    y: mix(-35, 35, random()),
    z: zDirection * mix(70, 145, random()),
  };
  const finalRotation = {
    rotationX: options.startRotation.x + rotationDelta.x,
    rotationY: options.startRotation.y + rotationDelta.y,
    rotationZ: options.startRotation.z + rotationDelta.z,
  };
  const rotatedBounds = createRotatedDollBounds(
    options.localBounds,
    finalRotation,
    options.scale,
  );
  const rootBounds = createSafeRootBounds(options.bounds, rotatedBounds);
  let landing = findNearestAllowedPosition(
    options.origin,
    rootBounds,
    rotatedBounds,
    options.blockedAreas,
  );

  // 从随机方向开始依次旋转 45 度尝试，完整外轮廓必须留在机舱内并避开挡板区域。
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const angle = startAngle + attempt * Math.PI / 4;
    const candidate = {
      x: options.origin.x + Math.cos(angle) * offset,
      z: options.origin.z + Math.sin(angle) * offset,
    };
    if (isLandingAllowed(candidate, rootBounds, rotatedBounds, options.blockedAreas)) {
      landing = candidate;
      break;
    }
  }

  return {
    landing: {
      ...landing,
      y: options.baseY - rotatedBounds.minY,
    },
    rotationDelta,
  };
}

function validateWeakDropOptions(options: WeakDropPlanOptions): void {
  const values = [
    options.origin.x,
    options.origin.z,
    options.bounds.minX,
    options.bounds.maxX,
    options.bounds.minZ,
    options.bounds.maxZ,
    options.minOffset,
    options.maxOffset,
    options.seed,
    options.startRotation.x,
    options.startRotation.y,
    options.startRotation.z,
    options.scale,
    options.baseY,
    options.localBounds.minX,
    options.localBounds.maxX,
    options.localBounds.minY,
    options.localBounds.maxY,
    options.localBounds.minZ,
    options.localBounds.maxZ,
  ];
  if (!values.every(Number.isFinite)
    || options.bounds.minX >= options.bounds.maxX
    || options.bounds.minZ >= options.bounds.maxZ
    || options.minOffset < 0
    || options.maxOffset < options.minOffset
    || options.scale <= 0
    || options.localBounds.minX >= options.localBounds.maxX
    || options.localBounds.minY >= options.localBounds.maxY
    || options.localBounds.minZ >= options.localBounds.maxZ
    || !Number.isInteger(options.seed)) {
    throw new Error('invalid weak drop options');
  }
}

function createSafeRootBounds(
  outer: HorizontalArea,
  rotated: DollBounds3D,
): HorizontalArea {
  const bounds = {
    minX: outer.minX - rotated.minX,
    maxX: outer.maxX - rotated.maxX,
    minZ: outer.minZ - rotated.minZ,
    maxZ: outer.maxZ - rotated.maxZ,
  };
  if (bounds.minX > bounds.maxX || bounds.minZ > bounds.maxZ) {
    throw new Error('doll footprint does not fit inside bounds');
  }
  return bounds;
}

function findNearestAllowedPosition(
  origin: HorizontalPoint,
  rootBounds: HorizontalArea,
  rotatedBounds: DollBounds3D,
  blockedAreas: readonly HorizontalArea[],
): HorizontalPoint {
  const clamped = {
    x: Math.min(rootBounds.maxX, Math.max(rootBounds.minX, origin.x)),
    z: Math.min(rootBounds.maxZ, Math.max(rootBounds.minZ, origin.z)),
  };
  if (isLandingAllowed(clamped, rootBounds, rotatedBounds, blockedAreas)) return clamped;

  let best: HorizontalPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  // 挡板挡住最近位置时扫描有限网格，选择距离原位最近的合法落点。
  for (let xIndex = 0; xIndex <= 16; xIndex += 1) {
    for (let zIndex = 0; zIndex <= 16; zIndex += 1) {
      const candidate = {
        x: mix(rootBounds.minX, rootBounds.maxX, xIndex / 16),
        z: mix(rootBounds.minZ, rootBounds.maxZ, zIndex / 16),
      };
      if (!isLandingAllowed(candidate, rootBounds, rotatedBounds, blockedAreas)) continue;
      const distance = Math.hypot(candidate.x - origin.x, candidate.z - origin.z);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
  }
  if (!best) throw new Error('unable to place dropped doll inside bounds');
  return best;
}

function isLandingAllowed(
  point: HorizontalPoint,
  rootBounds: HorizontalArea,
  rotatedBounds: DollBounds3D,
  blockedAreas: readonly HorizontalArea[],
): boolean {
  return isInsideArea(point, rootBounds)
    && blockedAreas.every((area) => (
      point.x + rotatedBounds.maxX < area.minX
      || point.x + rotatedBounds.minX > area.maxX
      || point.z + rotatedBounds.maxZ < area.minZ
      || point.z + rotatedBounds.minZ > area.maxZ
    ));
}

function isInsideArea(point: HorizontalPoint, area: HorizontalArea): boolean {
  return point.x >= area.minX
    && point.x <= area.maxX
    && point.z >= area.minZ
    && point.z <= area.maxZ;
}

function mix(min: number, max: number, ratio: number): number {
  return min + (max - min) * ratio;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
