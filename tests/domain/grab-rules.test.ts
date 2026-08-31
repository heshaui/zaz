import { describe, expect, it } from 'vitest';
import * as rulesModule from '../../game/assets/scripts/domain/grab-rules';

const rules = rulesModule as unknown as {
  selectStrongAttempt?: (
    maxAttempts: number,
    randomValue: number,
    minAttempt?: number,
  ) => number;
  advanceRandomCycle?: (options: {
    progress: number;
    strongAt: number;
    maxAttempts: number;
    nextRandomValue: number;
  }) => { isStrong: boolean; nextProgress: number; nextStrongAt: number };
};

describe('selectStrongAttempt', () => {
  it('随机值两端分别映射到第一次和最大次数', () => {
    expect(rules.selectStrongAttempt?.(10, 0)).toBe(1);
    expect(rules.selectStrongAttempt?.(10, 0.999999)).toBe(10);
    expect(rules.selectStrongAttempt?.(7, 0.5)).toBe(4);
  });

  it('迁移旧进度时只在尚未经过的次数中选择', () => {
    expect(rules.selectStrongAttempt?.(10, 0, 4)).toBe(4);
    expect(rules.selectStrongAttempt?.(10, 0.999999, 4)).toBe(10);
  });

  it('拒绝无效上限、下限和随机值', () => {
    expect(() => rules.selectStrongAttempt?.(0, 0.5)).toThrow();
    expect(() => rules.selectStrongAttempt?.(10, 1)).toThrow();
    expect(() => rules.selectStrongAttempt?.(10, 0.5, 11)).toThrow();
  });
});

describe('advanceRandomCycle', () => {
  it('未到隐藏目标时只推进次数并保留目标', () => {
    expect(rules.advanceRandomCycle?.({
      progress: 0,
      strongAt: 3,
      maxAttempts: 10,
      nextRandomValue: 0.99,
    })).toEqual({
      isStrong: false,
      nextProgress: 1,
      nextStrongAt: 3,
    });
  });

  it('到达隐藏目标后归零并生成下一周期目标', () => {
    expect(rules.advanceRandomCycle?.({
      progress: 2,
      strongAt: 3,
      maxAttempts: 10,
      nextRandomValue: 0.999999,
    })).toEqual({
      isStrong: true,
      nextProgress: 0,
      nextStrongAt: 10,
    });
  });

  it('上限降低到当前次数时下一局直接使用完整力度', () => {
    expect(rules.advanceRandomCycle?.({
      progress: 6,
      strongAt: 9,
      maxAttempts: 7,
      nextRandomValue: 0,
    })).toEqual({
      isStrong: true,
      nextProgress: 0,
      nextStrongAt: 1,
    });
  });

  it('拒绝无效进度和目标', () => {
    expect(() => rules.advanceRandomCycle?.({
      progress: -1,
      strongAt: 3,
      maxAttempts: 10,
      nextRandomValue: 0.5,
    })).toThrow();
    expect(() => rules.advanceRandomCycle?.({
      progress: 0,
      strongAt: 0,
      maxAttempts: 10,
      nextRandomValue: 0.5,
    })).toThrow();
  });
});
