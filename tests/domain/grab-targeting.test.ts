import { describe, expect, it } from 'vitest';
import {
  findNearestTargetIndex,
  resolveGrabOutcome,
} from '../../game/assets/scripts/domain/grab-targeting';

describe('findNearestTargetIndex', () => {
  const targets = [
    { x: -0.8, z: 0.2 },
    { x: 0.25, z: -0.15 },
    { x: 0.9, z: 0.6 },
  ];

  it('返回夹取半径内最近的目标', () => {
    expect(findNearestTargetIndex({ x: 0, z: 0 }, targets, 0.5)).toBe(1);
  });

  it('半径内没有目标时返回 null', () => {
    expect(findNearestTargetIndex({ x: 2, z: 2 }, targets, 0.5)).toBeNull();
  });

  it('爪子位于可见外轮廓上方时能够命中脚底原点较远的娃娃', () => {
    expect(findNearestTargetIndex(
      { x: -0.65, z: 0.15 },
      [{
        x: 0.8,
        z: 0.7,
        horizontalBounds: {
          minX: -0.9,
          maxX: 0.2,
          minZ: -0.1,
          maxZ: 0.5,
        },
      }],
      0.1,
    )).toBe(0);
  });

  it('忽略已经失效的目标', () => {
    expect(findNearestTargetIndex(
      { x: 0, z: 0 },
      [{ x: 0.1, z: 0.1, active: false }, { x: 0.3, z: 0.2, active: true }],
      0.5,
    )).toBe(1);
  });

  it('拒绝负数夹取半径', () => {
    expect(() => findNearestTargetIndex({ x: 0, z: 0 }, targets, -1)).toThrow(
      'aimRadius must be >= 0',
    );
  });
});

describe('resolveGrabOutcome', () => {
  it('弱爪命中后需要在半空松开', () => {
    expect(resolveGrabOutcome(false, true)).toEqual({ won: false, releaseAtHalf: true });
  });

  it('普通力度命中且保持到出口时仍然获胜', () => {
    expect(resolveGrabOutcome(false, true, true)).toEqual({ won: true, releaseAtHalf: false });
  });

  it('强爪命中后保持目标并获胜', () => {
    expect(resolveGrabOutcome(true, true)).toEqual({ won: true, releaseAtHalf: false });
  });

  it('强爪落点错误也会失败且不执行松开动画', () => {
    expect(resolveGrabOutcome(true, false)).toEqual({ won: false, releaseAtHalf: false });
  });
});
