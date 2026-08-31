import {
  clampHorizontalPosition,
  type HorizontalBounds,
  type HorizontalPosition,
} from './machine-bounds';

export interface JoystickOutput {
  knobX: number;
  knobY: number;
  valueX: number;
  valueY: number;
}

export interface JoystickValue {
  x: number;
  y: number;
}

export function normalizeJoystickOffset(x: number, y: number, radius: number): JoystickOutput {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error('radius must be > 0');
  }

  const length = Math.sqrt(x * x + y * y);
  const scale = length > radius ? radius / length : 1;
  const knobX = x * scale;
  const knobY = y * scale;
  return {
    knobX,
    knobY,
    valueX: knobX / radius,
    valueY: knobY / radius,
  };
}

export function advanceHorizontalPosition(
  position: HorizontalPosition,
  input: JoystickValue,
  speed: number,
  deltaTime: number,
  bounds: HorizontalBounds,
): HorizontalPosition {
  if (!Number.isFinite(deltaTime) || deltaTime < 0) {
    throw new Error('deltaTime must be >= 0');
  }
  if (!Number.isFinite(speed) || speed < 0) {
    throw new Error('speed must be >= 0');
  }

  // 屏幕向上推动摇杆时，3D 世界中的滑车沿 -Z 方向移动。
  return clampHorizontalPosition({
    x: position.x + input.x * speed * deltaTime,
    z: position.z - input.y * speed * deltaTime,
  }, bounds);
}
