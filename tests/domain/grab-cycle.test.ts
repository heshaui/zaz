import { describe, expect, it } from 'vitest';
import { createGrabCycleTimeline } from '../../game/assets/scripts/domain/grab-cycle';
import * as grabCycleModule from '../../game/assets/scripts/domain/grab-cycle';

describe('createGrabCycleTimeline', () => {
  it('夹取成功时先回到出奖口，再张开并送入出口', () => {
    expect(createGrabCycleTimeline({ won: true, releaseAtHalf: false })).toEqual([
      'open-and-drop',
      'close',
      'lift-home',
      'return-to-chute',
      'open-over-chute',
      'deliver-prize',
      'park',
    ]);
  });

  it('中途松开时仍执行空载回程并在出口上方张开', () => {
    expect(createGrabCycleTimeline({ won: false, releaseAtHalf: true })).toEqual([
      'open-and-drop',
      'close',
      'lift-half',
      'release-midway',
      'lift-home',
      'return-to-chute',
      'open-over-chute',
      'park',
    ]);
  });

  it('没有夹到娃娃时也会完成回程', () => {
    expect(createGrabCycleTimeline({ won: false, releaseAtHalf: false })).toEqual([
      'open-and-drop',
      'close',
      'lift-home',
      'return-to-chute',
      'open-over-chute',
      'park',
    ]);
  });
});

describe('createWeakDropPlan', () => {
  const createPlan = (grabCycleModule as typeof grabCycleModule & {
    createWeakDropPlan?: (options: {
      origin: { x: number; z: number };
      bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
      blockedAreas: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
      minOffset: number;
      maxOffset: number;
      seed: number;
      localBounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        minZ: number;
        maxZ: number;
      };
      startRotation: { x: number; y: number; z: number };
      scale: number;
      baseY: number;
    }) => {
      landing: { x: number; y: number; z: number };
      rotationDelta: { x: number; y: number; z: number };
    };
  }).createWeakDropPlan;

  const options = {
    origin: { x: 0.4, z: 0 },
    bounds: { minX: -1.82, maxX: 1.82, minZ: -1.32, maxZ: 1.38 },
    blockedAreas: [{ minX: -1.86, maxX: -0.52, minZ: 0.38, maxZ: 1.42 }],
    minOffset: 0.1,
    maxOffset: 0.25,
    seed: 17,
    localBounds: {
      minX: -0.668,
      maxX: 0.643,
      minY: -0.033,
      maxY: 1.927,
      minZ: -0.52,
      maxZ: 0.494,
    },
    startRotation: { x: 20, y: 35, z: 32 },
    scale: 0.76,
    baseY: 1.38,
  };

  it('相同轮次生成相同的偏移与翻转参数', () => {
    expect(createPlan).toBeDefined();
    if (!createPlan) return;

    expect(createPlan(options)).toEqual(createPlan(options));
  });

  it('最终位置只在允许范围内小幅偏移', () => {
    expect(createPlan).toBeDefined();
    if (!createPlan) return;

    const plan = createPlan(options);
    const distance = Math.hypot(
      plan.landing.x - options.origin.x,
      plan.landing.z - options.origin.z,
    );

    expect(distance).toBeGreaterThanOrEqual(0.1);
    expect(distance).toBeLessThanOrEqual(0.25);
    expect(plan.landing.x).toBeGreaterThanOrEqual(options.bounds.minX);
    expect(plan.landing.x).toBeLessThanOrEqual(options.bounds.maxX);
    expect(plan.landing.z).toBeGreaterThanOrEqual(options.bounds.minZ);
    expect(plan.landing.z).toBeLessThanOrEqual(options.bounds.maxZ);
  });

  it('靠近挡板时选择不会进入挡板区域的方向', () => {
    expect(createPlan).toBeDefined();
    if (!createPlan) return;

    const plan = createPlan({ ...options, origin: { x: -0.45, z: 0.28 }, seed: 3 });
    const blocked = options.blockedAreas[0];
    const inside = plan.landing.x >= blocked.minX
      && plan.landing.x <= blocked.maxX
      && plan.landing.z >= blocked.minZ
      && plan.landing.z <= blocked.maxZ;
    expect(inside).toBe(false);
  });

  it('翻转参数足以形成明显的弹起翻身效果', () => {
    expect(createPlan).toBeDefined();
    if (!createPlan) return;

    const plan = createPlan(options);
    expect(Math.abs(plan.rotationDelta.x)).toBeGreaterThanOrEqual(55);
    expect(Math.abs(plan.rotationDelta.z)).toBeGreaterThanOrEqual(70);
  });

  it('靠近前侧松开后完整外轮廓仍留在柜内并贴住底板', () => {
    expect(createPlan).toBeDefined();
    if (!createPlan) return;

    const edgeOptions = {
      ...options,
      origin: { x: 0.8, z: 1.3 },
      seed: 6,
    };
    const plan = createPlan(edgeOptions);
    const worldBounds = calculateWorldBounds(
      edgeOptions.localBounds,
      edgeOptions.startRotation,
      edgeOptions.scale,
      plan,
    );

    const tolerance = 1e-9;
    expect(worldBounds.minX).toBeGreaterThanOrEqual(edgeOptions.bounds.minX - tolerance);
    expect(worldBounds.maxX).toBeLessThanOrEqual(edgeOptions.bounds.maxX + tolerance);
    expect(worldBounds.minZ).toBeGreaterThanOrEqual(edgeOptions.bounds.minZ - tolerance);
    expect(worldBounds.maxZ).toBeLessThanOrEqual(edgeOptions.bounds.maxZ + tolerance);
    expect(worldBounds.minY).toBeCloseTo(edgeOptions.baseY);
  });
});

function calculateWorldBounds(
  localBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  },
  startRotation: { x: number; y: number; z: number },
  scale: number,
  plan: {
    landing: { x: number; y: number; z: number };
    rotationDelta: { x: number; y: number; z: number };
  },
) {
  const rotation = {
    x: startRotation.x + plan.rotationDelta.x,
    y: startRotation.y + plan.rotationDelta.y,
    z: startRotation.z + plan.rotationDelta.z,
  };
  const halfToRad = Math.PI / 360;
  const sx = Math.sin(rotation.x * halfToRad);
  const cx = Math.cos(rotation.x * halfToRad);
  const sy = Math.sin(rotation.y * halfToRad);
  const cy = Math.cos(rotation.y * halfToRad);
  const sz = Math.sin(rotation.z * halfToRad);
  const cz = Math.cos(rotation.z * halfToRad);
  // 独立计算八个角点，验证最终可见外轮廓，而不是只验证根节点坐标。
  const quaternion = {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz - sx * sy * sz,
  };
  const points: Array<{ x: number; y: number; z: number }> = [];
  for (const x of [localBounds.minX, localBounds.maxX]) {
    for (const y of [localBounds.minY, localBounds.maxY]) {
      for (const z of [localBounds.minZ, localBounds.maxZ]) {
        const point = { x: x * scale, y: y * scale, z: z * scale };
        const tx = 2 * (quaternion.y * point.z - quaternion.z * point.y);
        const ty = 2 * (quaternion.z * point.x - quaternion.x * point.z);
        const tz = 2 * (quaternion.x * point.y - quaternion.y * point.x);
        points.push({
          x: plan.landing.x
            + point.x + quaternion.w * tx + quaternion.y * tz - quaternion.z * ty,
          y: plan.landing.y
            + point.y + quaternion.w * ty + quaternion.z * tx - quaternion.x * tz,
          z: plan.landing.z
            + point.z + quaternion.w * tz + quaternion.x * ty - quaternion.y * tx,
        });
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
