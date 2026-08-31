export interface HorizontalPosition {
  x: number;
  z: number;
}

export interface HorizontalBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const DEFAULT_MACHINE_BOUNDS: HorizontalBounds = {
  minX: -1.55,
  maxX: 1.55,
  minZ: -1.05,
  maxZ: 1.05,
};

export function clampHorizontalPosition(
  position: HorizontalPosition,
  bounds: HorizontalBounds,
): HorizontalPosition {
  if (bounds.minX > bounds.maxX || bounds.minZ > bounds.maxZ) {
    throw new Error('invalid horizontal bounds');
  }

  // X/Z 必须在同一次计算中钳制，防止斜向移动时沿单轴穿出玻璃柜体。
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, position.x)),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, position.z)),
  };
}
