export type DollPose = 'side' | 'reclined' | 'tilted';

export interface DollLayoutBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type DollLayoutExclusion = DollLayoutBounds;

export interface DollBounds3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface DollLayoutOptions {
  count: number;
  colors: readonly string[];
  seed: number;
  bounds: DollLayoutBounds;
  baseY: number;
  minScale: number;
  maxScale: number;
  exclusions?: readonly DollLayoutExclusion[];
  localBounds?: DollBounds3D;
  minCenterDistance?: number;
}

export interface DollPlacement {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  color: string;
  pose: DollPose;
  worldBounds: DollBounds3D;
}

const UINT32_RANGE = 4_294_967_296;
const MAX_ORIENTATION_ATTEMPTS = 24;

export function createDollLayout(options: DollLayoutOptions): DollPlacement[] {
  validateOptions(options);
  if (options.count === 0) return [];

  const random = createSeededRandom(options.seed);
  const width = options.bounds.maxX - options.bounds.minX;
  const depth = options.bounds.maxZ - options.bounds.minZ;
  const columns = Math.max(1, Math.ceil(Math.sqrt(options.count * (width / depth))));
  const rows = Math.ceil(options.count / columns);
  const placedCenters: Array<{ x: number; z: number }> = [];

  return Array.from({ length: options.count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const itemsInRow = Math.min(columns, options.count - row * columns);
    const rowOffset = (columns - itemsInRow) / 2;
    const pose = poseForIndex(index);

    // 某些横躺朝向会同时碰到机台边缘和出奖口，此时重选朝向，不能只重选根节点位置。
    for (let orientationAttempt = 0;
      orientationAttempt < MAX_ORIENTATION_ATTEMPTS;
      orientationAttempt += 1) {
      const rotation = createRotation(pose, random);
      const xRatio = (column + rowOffset + 0.2 + random() * 0.6) / columns;
      const zRatio = (row + 0.2 + random() * 0.6) / rows;
      const scale = mix(options.minScale, options.maxScale, random());
      const rotatedBounds = createRotatedDollBounds(options.localBounds, rotation, scale);
      const rootBounds = createRootBounds(options.bounds, rotatedBounds);
      if (!rootBounds) continue;
      const initialX = mix(rootBounds.minX, rootBounds.maxX, xRatio);
      const initialZ = mix(rootBounds.minZ, rootBounds.maxZ, zRatio);
      const position = findAllowedPosition(
        initialX,
        initialZ,
        rootBounds,
        rotatedBounds,
        options.exclusions ?? [],
        placedCenters,
        options.minCenterDistance ?? 0,
        random,
      );
      if (!position) continue;
      const y = options.baseY - rotatedBounds.minY;
      const worldBounds = {
        minX: position.x + rotatedBounds.minX,
        maxX: position.x + rotatedBounds.maxX,
        minY: y + rotatedBounds.minY,
        maxY: y + rotatedBounds.maxY,
        minZ: position.z + rotatedBounds.minZ,
        maxZ: position.z + rotatedBounds.maxZ,
      };
      placedCenters.push({
        x: (worldBounds.minX + worldBounds.maxX) / 2,
        z: (worldBounds.minZ + worldBounds.maxZ) / 2,
      });

      return {
        x: position.x,
        y,
        z: position.z,
        ...rotation,
        scale,
        color: options.colors[index % options.colors.length],
        pose,
        worldBounds,
      };
    }

    throw new Error(`unable to place doll footprint at index ${index}`);
  });
}

export function selectReplacementPlacement(
  candidates: readonly DollPlacement[],
  occupiedCenters: readonly { x: number; z: number }[],
  minDistance: number,
): DollPlacement | null {
  if (!Number.isFinite(minDistance) || minDistance < 0) {
    throw new Error('minDistance must be >= 0');
  }
  const minimumSquared = minDistance * minDistance;
  return candidates.find((candidate) => {
    const centerX = (candidate.worldBounds.minX + candidate.worldBounds.maxX) / 2;
    const centerZ = (candidate.worldBounds.minZ + candidate.worldBounds.maxZ) / 2;
    return occupiedCenters.every((occupied) => {
      const dx = centerX - occupied.x;
      const dz = centerZ - occupied.z;
      return dx * dx + dz * dz >= minimumSquared;
    });
  }) ?? null;
}

export function shouldRefreshDollBatch(activeStates: readonly boolean[]): boolean {
  return activeStates.length > 0 && activeStates.every((active) => !active);
}

function validateOptions(options: DollLayoutOptions): void {
  if (!Number.isInteger(options.count) || options.count < 0) {
    throw new Error('count must be a non-negative integer');
  }
  if (options.colors.length === 0) throw new Error('colors must not be empty');
  if (options.colors.some((color) => color.trim().length === 0)) {
    throw new Error('colors must not contain blank values');
  }
  if (!Number.isInteger(options.seed)) throw new Error('seed must be an integer');

  const { minX, maxX, minZ, maxZ } = options.bounds;
  if (
    ![minX, maxX, minZ, maxZ, options.baseY].every(Number.isFinite)
    || minX >= maxX
    || minZ >= maxZ
  ) {
    throw new Error('invalid doll bounds');
  }
  if (
    !Number.isFinite(options.minScale)
    || !Number.isFinite(options.maxScale)
    || options.minScale <= 0
    || options.minScale > options.maxScale
  ) {
    throw new Error('invalid doll scale range');
  }
  if ((options.exclusions ?? []).some((exclusion) => {
    const values = [exclusion.minX, exclusion.maxX, exclusion.minZ, exclusion.maxZ];
    return !values.every(Number.isFinite)
      || exclusion.minX >= exclusion.maxX
      || exclusion.minZ >= exclusion.maxZ;
  })) {
    throw new Error('invalid doll exclusion');
  }
  if (options.localBounds) validateLocalBounds(options.localBounds);
  if (!Number.isFinite(options.minCenterDistance ?? 0) || (options.minCenterDistance ?? 0) < 0) {
    throw new Error('minCenterDistance must be >= 0');
  }
}

function findAllowedPosition(
  initialX: number,
  initialZ: number,
  rootBounds: DollLayoutBounds,
  rotatedBounds: DollBounds3D,
  exclusions: readonly DollLayoutExclusion[],
  placedCenters: readonly { x: number; z: number }[],
  minCenterDistance: number,
  random: () => number,
): { x: number; z: number } | null {
  if (
    !intersectsAnyExclusion(initialX, initialZ, rotatedBounds, exclusions)
    && isFarEnoughFromPlaced(initialX, initialZ, rotatedBounds, placedCenters, minCenterDistance)
  ) {
    return { x: initialX, z: initialZ };
  }

  const width = rootBounds.maxX - rootBounds.minX;
  const depth = rootBounds.maxZ - rootBounds.minZ;
  // 原格位落入出奖口时，在完整可用区域内做确定性重选；固定上限防止错误配置造成死循环。
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const x = rootBounds.minX + random() * width;
    const z = rootBounds.minZ + random() * depth;
    if (
      !intersectsAnyExclusion(x, z, rotatedBounds, exclusions)
      && isFarEnoughFromPlaced(x, z, rotatedBounds, placedCenters, minCenterDistance)
    ) return { x, z };
  }

  return null;
}

function isFarEnoughFromPlaced(
  x: number,
  z: number,
  bounds: DollBounds3D,
  placedCenters: readonly { x: number; z: number }[],
  minDistance: number,
): boolean {
  if (minDistance === 0) return true;
  const centerX = x + (bounds.minX + bounds.maxX) / 2;
  const centerZ = z + (bounds.minZ + bounds.maxZ) / 2;
  const minimumSquared = minDistance * minDistance;
  return placedCenters.every((placed) => {
    const dx = centerX - placed.x;
    const dz = centerZ - placed.z;
    return dx * dx + dz * dz >= minimumSquared;
  });
}

function intersectsAnyExclusion(
  x: number,
  z: number,
  bounds: DollBounds3D,
  exclusions: readonly DollLayoutExclusion[],
): boolean {
  return exclusions.some((area) => x + bounds.maxX >= area.minX
    && x + bounds.minX <= area.maxX
    && z + bounds.maxZ >= area.minZ
    && z + bounds.minZ <= area.maxZ);
}

function validateLocalBounds(bounds: DollBounds3D): void {
  const values = [
    bounds.minX,
    bounds.maxX,
    bounds.minY,
    bounds.maxY,
    bounds.minZ,
    bounds.maxZ,
  ];
  if (!values.every(Number.isFinite)
    || bounds.minX >= bounds.maxX
    || bounds.minY >= bounds.maxY
    || bounds.minZ >= bounds.maxZ) {
    throw new Error('invalid doll local bounds');
  }
}

function createRootBounds(
  outer: DollLayoutBounds,
  rotated: DollBounds3D,
): DollLayoutBounds | null {
  const bounds = {
    minX: outer.minX - rotated.minX,
    maxX: outer.maxX - rotated.maxX,
    minZ: outer.minZ - rotated.minZ,
    maxZ: outer.maxZ - rotated.maxZ,
  };
  if (bounds.minX > bounds.maxX || bounds.minZ > bounds.maxZ) {
    return null;
  }
  return bounds;
}

export function createRotatedDollBounds(
  localBounds: DollBounds3D | undefined,
  rotation: Pick<DollPlacement, 'rotationX' | 'rotationY' | 'rotationZ'>,
  scale: number,
): DollBounds3D {
  if (!localBounds) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  }

  const quaternion = quaternionFromEuler(rotation.rotationX, rotation.rotationY, rotation.rotationZ);
  const points: Array<{ x: number; y: number; z: number }> = [];
  for (const x of [localBounds.minX, localBounds.maxX]) {
    for (const y of [localBounds.minY, localBounds.maxY]) {
      for (const z of [localBounds.minZ, localBounds.maxZ]) {
        points.push(rotatePoint({ x: x * scale, y: y * scale, z: z * scale }, quaternion));
      }
    }
  }
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

function quaternionFromEuler(x: number, y: number, z: number): {
  x: number;
  y: number;
  z: number;
  w: number;
} {
  const halfToRad = Math.PI / 360;
  const sx = Math.sin(x * halfToRad);
  const cx = Math.cos(x * halfToRad);
  const sy = Math.sin(y * halfToRad);
  const cy = Math.cos(y * halfToRad);
  const sz = Math.sin(z * halfToRad);
  const cz = Math.cos(z * halfToRad);
  // 与 Cocos 的 YZX 欧拉角顺序保持一致，避免布局计算与实际显示出现偏差。
  return {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz - sx * sy * sz,
  };
}

function rotatePoint(
  point: { x: number; y: number; z: number },
  quaternion: { x: number; y: number; z: number; w: number },
): { x: number; y: number; z: number } {
  const tx = 2 * (quaternion.y * point.z - quaternion.z * point.y);
  const ty = 2 * (quaternion.z * point.x - quaternion.x * point.z);
  const tz = 2 * (quaternion.x * point.y - quaternion.y * point.x);
  return {
    x: point.x + quaternion.w * tx + quaternion.y * tz - quaternion.z * ty,
    y: point.y + quaternion.w * ty + quaternion.z * tx - quaternion.x * tz,
    z: point.z + quaternion.w * tz + quaternion.x * ty - quaternion.y * tx,
  };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function poseForIndex(index: number): DollPose {
  const poses: readonly DollPose[] = ['side', 'reclined', 'tilted'];
  return poses[index % poses.length];
}

function createRotation(
  pose: DollPose,
  random: () => number,
): Pick<DollPlacement, 'rotationX' | 'rotationY' | 'rotationZ'> {
  const direction = random() < 0.5 ? -1 : 1;
  if (pose === 'side') {
    return {
      rotationX: mix(-10, 10, random()),
      rotationY: mix(0, 360, random()),
      rotationZ: direction * mix(65, 90, random()),
    };
  }
  if (pose === 'reclined') {
    return {
      rotationX: mix(55, 78, random()),
      rotationY: mix(0, 360, random()),
      rotationZ: mix(-18, 18, random()),
    };
  }
  return {
    rotationX: mix(12, 35, random()),
    rotationY: mix(0, 360, random()),
    rotationZ: direction * mix(25, 50, random()),
  };
}

function mix(min: number, max: number, ratio: number): number {
  return min + (max - min) * ratio;
}
