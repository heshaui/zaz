import { describe, expect, it } from 'vitest';
import {
  createDollLayout,
  type DollPlacement,
  type DollLayoutOptions,
} from '../../game/assets/scripts/domain/doll-layout';
import * as dollLayoutModule from '../../game/assets/scripts/domain/doll-layout';

const options: DollLayoutOptions = {
  count: 12,
  colors: ['#f4a6b8', '#8dc9c1', '#f3cc73'],
  seed: 20260827,
  bounds: {
    minX: -1.25,
    maxX: 1.25,
    minZ: -0.82,
    maxZ: 0.82,
  },
  baseY: 1.08,
  minScale: 0.9,
  maxScale: 1.08,
};

const rabbitLocalBounds = {
  minX: -0.668,
  maxX: 0.643,
  minY: -0.033,
  maxY: 1.927,
  minZ: -0.52,
  maxZ: 0.494,
};

describe('createDollLayout', () => {
  it('相同配置和种子始终生成相同布局', () => {
    expect(createDollLayout(options)).toEqual(createDollLayout(options));
  });

  it('按配置数量生成且所有娃娃都在指定范围内', () => {
    const layout = createDollLayout(options);

    expect(layout).toHaveLength(12);
    layout.forEach((doll) => {
      expect(doll.x).toBeGreaterThanOrEqual(-1.25);
      expect(doll.x).toBeLessThanOrEqual(1.25);
      expect(doll.z).toBeGreaterThanOrEqual(-0.82);
      expect(doll.z).toBeLessThanOrEqual(0.82);
      expect(doll.y).toBe(1.08);
      expect(doll.scale).toBeGreaterThanOrEqual(0.9);
      expect(doll.scale).toBeLessThanOrEqual(1.08);
    });
  });

  it('稳定混合侧躺、后仰和倾斜姿势，并只使用配置颜色', () => {
    const layout = createDollLayout(options);

    expect(new Set(layout.map((doll) => doll.pose))).toEqual(
      new Set(['side', 'reclined', 'tilted']),
    );
    layout.forEach((doll) => {
      expect(options.colors).toContain(doll.color);
    });
  });

  it('最后一行数量不足时仍围绕机台中线摆放', () => {
    const lastRow = createDollLayout(options).slice(-2);

    expect(lastRow[0].x).toBeLessThan(0);
    expect(lastRow[1].x).toBeGreaterThan(0);
  });

  it('数量为零时返回空布局', () => {
    expect(createDollLayout({ ...options, count: 0 })).toEqual([]);
  });

  it('所有娃娃都会避开出奖口及玻璃挡板区域', () => {
    const exclusion = {
      minX: -1.65,
      maxX: -0.48,
      minZ: 0.2,
      maxZ: 0.9,
    };
    const layout = createDollLayout({
      ...options,
      count: 24,
      bounds: {
        minX: -1.82,
        maxX: 1.82,
        minZ: -1.32,
        maxZ: 1.38,
      },
      localBounds: rabbitLocalBounds,
      exclusions: [exclusion],
    });

    expect(layout).toHaveLength(24);
    layout.forEach((doll) => {
      const overlapsChute = doll.worldBounds.maxX >= exclusion.minX
        && doll.worldBounds.minX <= exclusion.maxX
        && doll.worldBounds.maxZ >= exclusion.minZ
        && doll.worldBounds.minZ <= exclusion.maxZ;
      expect(overlapsChute).toBe(false);
    });
  });

  it('按旋转后的完整外轮廓限制位置并贴住底板', () => {
    const cabinetBounds = {
      minX: -1.82,
      maxX: 1.82,
      minZ: -1.32,
      maxZ: 1.38,
    };
    const layout = createDollLayout({
      ...options,
      count: 24,
      bounds: cabinetBounds,
      baseY: 1.38,
      localBounds: rabbitLocalBounds,
    } as DollLayoutOptions);

    layout.forEach((doll) => {
      const worldBounds = (doll as typeof doll & {
        worldBounds?: typeof rabbitLocalBounds;
      }).worldBounds;
      expect(worldBounds).toBeDefined();
      if (!worldBounds) return;
      expect(worldBounds.minX).toBeGreaterThanOrEqual(cabinetBounds.minX);
      expect(worldBounds.maxX).toBeLessThanOrEqual(cabinetBounds.maxX);
      expect(worldBounds.minZ).toBeGreaterThanOrEqual(cabinetBounds.minZ);
      expect(worldBounds.maxZ).toBeLessThanOrEqual(cabinetBounds.maxZ);
      expect(worldBounds.minY).toBeCloseTo(1.38);
    });
  });

  it('空间足够时娃娃中心保持最小间距', () => {
    const minimumDistance = 0.45;
    const layout = createDollLayout({
      ...options,
      count: 8,
      bounds: { minX: -1.82, maxX: 1.82, minZ: -1.32, maxZ: 1.38 },
      exclusions: [{ minX: -1.86, maxX: -0.52, minZ: 0.38, maxZ: 1.42 }],
      localBounds: rabbitLocalBounds,
      minCenterDistance: minimumDistance,
      minScale: 0.68,
      maxScale: 0.82,
    } as DollLayoutOptions);

    for (let left = 0; left < layout.length; left += 1) {
      for (let right = left + 1; right < layout.length; right += 1) {
        const leftCenterX = (layout[left].worldBounds.minX + layout[left].worldBounds.maxX) / 2;
        const leftCenterZ = (layout[left].worldBounds.minZ + layout[left].worldBounds.maxZ) / 2;
        const rightCenterX = (layout[right].worldBounds.minX + layout[right].worldBounds.maxX) / 2;
        const rightCenterZ = (layout[right].worldBounds.minZ + layout[right].worldBounds.maxZ) / 2;
        expect(Math.hypot(leftCenterX - rightCenterX, leftCenterZ - rightCenterZ))
          .toBeGreaterThanOrEqual(minimumDistance);
      }
    }
  });

  it('补充娃娃时跳过靠近现有娃娃的候选位置', () => {
    const createPlacement = (x: number): DollPlacement => ({
      x,
      y: 1.38,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scale: 0.72,
      color: '#f4a6b8',
      pose: 'side',
      worldBounds: {
        minX: x - 0.2,
        maxX: x + 0.2,
        minY: 1.38,
        maxY: 2,
        minZ: -0.2,
        maxZ: 0.2,
      },
    });
    const candidates = [createPlacement(0.1), createPlacement(1.2)];
    const selector = (dollLayoutModule as typeof dollLayoutModule & {
      selectReplacementPlacement?: (
        placements: readonly DollPlacement[],
        occupiedCenters: readonly { x: number; z: number }[],
        minDistance: number,
      ) => DollPlacement | null;
    }).selectReplacementPlacement;

    expect(selector).toBeDefined();
    if (!selector) return;
    expect(selector(candidates, [{ x: 0, z: 0 }], 0.45)).toBe(candidates[1]);
  });

  it('场内仍有娃娃时不进行整批恢复', () => {
    const shouldRefresh = (dollLayoutModule as typeof dollLayoutModule & {
      shouldRefreshDollBatch?: (activeStates: readonly boolean[]) => boolean;
    }).shouldRefreshDollBatch;

    expect(shouldRefresh).toBeDefined();
    if (!shouldRefresh) return;
    expect(shouldRefresh([false, false, true, false, false, false, false, false])).toBe(false);
  });

  it('场内八只全部离场后进行整批恢复', () => {
    const shouldRefresh = (dollLayoutModule as typeof dollLayoutModule & {
      shouldRefreshDollBatch?: (activeStates: readonly boolean[]) => boolean;
    }).shouldRefreshDollBatch;

    expect(shouldRefresh).toBeDefined();
    if (!shouldRefresh) return;
    expect(shouldRefresh([false, false, false, false, false, false, false, false])).toBe(true);
  });

  it.each([
    [{ ...options, count: -1 }, 'count must be a non-negative integer'],
    [{ ...options, count: 1.5 }, 'count must be a non-negative integer'],
    [{ ...options, colors: [] }, 'colors must not be empty'],
    [
      { ...options, bounds: { minX: 1, maxX: -1, minZ: -1, maxZ: 1 } },
      'invalid doll bounds',
    ],
    [{ ...options, minScale: 1.2, maxScale: 0.8 }, 'invalid doll scale range'],
    [
      {
        ...options,
        exclusions: [{ minX: 0, maxX: -1, minZ: -1, maxZ: 1 }],
      },
      'invalid doll exclusion',
    ],
    [
      {
        ...options,
        localBounds: { ...rabbitLocalBounds, minY: 2, maxY: 1 },
      },
      'invalid doll local bounds',
    ],
  ])('拒绝错误配置', (invalidOptions, message) => {
    expect(() => createDollLayout(invalidOptions as DollLayoutOptions)).toThrow(message as string);
  });
});
