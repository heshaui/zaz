import { describe, expect, it } from 'vitest';
import {
  advanceHorizontalPosition,
  normalizeJoystickOffset,
} from '../../game/assets/scripts/domain/machine-controls';
import { DEFAULT_MACHINE_BOUNDS } from '../../game/assets/scripts/domain/machine-bounds';

describe('normalizeJoystickOffset', () => {
  it('保留摇杆半径内的偏移并输出归一化力度', () => {
    expect(normalizeJoystickOffset(35, -14, 70)).toEqual({
      knobX: 35,
      knobY: -14,
      valueX: 0.5,
      valueY: -0.2,
    });
  });

  it('把超出范围的偏移限制在圆形边缘', () => {
    const result = normalizeJoystickOffset(90, 120, 75);
    expect(result.knobX).toBeCloseTo(45);
    expect(result.knobY).toBeCloseTo(60);
    expect(result.valueX).toBeCloseTo(0.6);
    expect(result.valueY).toBeCloseTo(0.8);
  });

  it('拒绝无效摇杆半径', () => {
    expect(() => normalizeJoystickOffset(0, 0, 0)).toThrow('radius must be > 0');
  });
});

describe('advanceHorizontalPosition', () => {
  it('按摇杆输入、速度和帧时间移动两个水平轴', () => {
    expect(advanceHorizontalPosition(
      { x: 0, z: 0 },
      { x: 0.5, y: -0.25 },
      2,
      0.5,
      DEFAULT_MACHINE_BOUNDS,
    )).toEqual({ x: 0.5, z: 0.25 });
  });

  it('移动结果不会穿出机台边界', () => {
    expect(advanceHorizontalPosition(
      { x: 1.5, z: 1 },
      { x: 1, y: -1 },
      2,
      1,
      DEFAULT_MACHINE_BOUNDS,
    )).toEqual({ x: 1.55, z: 1.05 });
  });

  it('禁用输入或帧时间异常时由调用方保持静止', () => {
    expect(() => advanceHorizontalPosition(
      { x: 0, z: 0 },
      { x: 1, y: 1 },
      1.8,
      -0.01,
      DEFAULT_MACHINE_BOUNDS,
    )).toThrow('deltaTime must be >= 0');
  });
});
