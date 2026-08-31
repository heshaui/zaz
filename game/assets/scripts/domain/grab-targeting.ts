import type { HorizontalPosition } from './machine-bounds';

export interface GrabTargetPosition extends HorizontalPosition {
  active?: boolean;
  horizontalBounds?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

export interface GrabOutcome {
  won: boolean;
  releaseAtHalf: boolean;
}

export function findNearestTargetIndex(
  claw: HorizontalPosition,
  targets: readonly GrabTargetPosition[],
  aimRadius: number,
): number | null {
  if (!Number.isFinite(aimRadius) || aimRadius < 0) {
    throw new Error('aimRadius must be >= 0');
  }

  let nearestIndex: number | null = null;
  let nearestSquaredDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (target.active === false) continue;

    const dx = target.horizontalBounds
      ? distanceToRange(claw.x, target.horizontalBounds.minX, target.horizontalBounds.maxX)
      : target.x - claw.x;
    const dz = target.horizontalBounds
      ? distanceToRange(claw.z, target.horizontalBounds.minZ, target.horizontalBounds.maxZ)
      : target.z - claw.z;
    const squaredDistance = dx * dx + dz * dz;
    if (squaredDistance < nearestSquaredDistance) {
      nearestSquaredDistance = squaredDistance;
      nearestIndex = index;
    }
  }

  return nearestSquaredDistance <= aimRadius * aimRadius ? nearestIndex : null;
}

function distanceToRange(value: number, min: number, max: number): number {
  if (value < min) return min - value;
  if (value > max) return max - value;
  return 0;
}

export function resolveGrabOutcome(
  isStrong: boolean,
  aimedCorrectly: boolean,
  weakReachedChute = false,
): GrabOutcome {
  const won = aimedCorrectly && (isStrong || weakReachedChute);
  return {
    won,
    releaseAtHalf: !won && !isStrong && aimedCorrectly,
  };
}
