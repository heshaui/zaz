import { describe, expect, it } from 'vitest';
import {
  clampHorizontalPosition,
  type HorizontalBounds,
} from '../../game/assets/scripts/domain/machine-bounds';

const bounds: HorizontalBounds = {
  minX: -1.55,
  maxX: 1.55,
  minZ: -1.05,
  maxZ: 1.05,
};

describe('clampHorizontalPosition', () => {
  it('保留机台边界内的位置', () => {
    expect(clampHorizontalPosition({ x: 0.8, z: -0.6 }, bounds)).toEqual({ x: 0.8, z: -0.6 });
  });

  it('同时限制超出边界的两个水平轴', () => {
    expect(clampHorizontalPosition({ x: 2.3, z: -1.8 }, bounds)).toEqual({ x: 1.55, z: -1.05 });
  });

  it('拒绝颠倒的边界配置', () => {
    expect(() => clampHorizontalPosition(
      { x: 0, z: 0 },
      { minX: 1, maxX: -1, minZ: -1, maxZ: 1 },
    )).toThrow('invalid horizontal bounds');
  });
});
