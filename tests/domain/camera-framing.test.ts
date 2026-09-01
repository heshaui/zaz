import { describe, expect, it } from 'vitest';
import {
  createMachineCameraPlacements,
  getMachineCameraProfile,
  interpolateMachineCameraPlacement,
  selectMachineCameraPlacement,
  type MachineViewBounds,
} from '../../game/assets/scripts/domain/camera-framing';
import * as cameraFraming from '../../game/assets/scripts/domain/camera-framing';

const bounds: MachineViewBounds = {
  minX: -2.33,
  maxX: 2.33,
  minY: 0,
  maxY: 5.73,
  minZ: -1.78,
  maxZ: 2.15,
};

describe('createMachineCameraPlacements', () => {
  it('竖屏前视角完整容纳机柜八个边界点', () => {
    const verticalFov = 45;
    const aspectRatio = 393 / 768;
    const result = createMachineCameraPlacements({
      bounds,
      verticalFov,
      aspectRatio,
      margin: 1.08,
      elevationDegrees: 16,
    });

    const projected = projectFrontBounds(bounds, result.front, verticalFov, aspectRatio);
    projected.forEach(({ x, y }) => {
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    });
    expect(result.front.position.z).toBeLessThan(15);
  });

  it('宽屏时相机比竖屏更靠近机柜', () => {
    const portrait = createMachineCameraPlacements({
      bounds,
      verticalFov: 45,
      aspectRatio: 393 / 768,
      margin: 1.08,
      elevationDegrees: 16,
    });
    const landscape = createMachineCameraPlacements({
      bounds,
      verticalFov: 45,
      aspectRatio: 16 / 9,
      margin: 1.08,
      elevationDegrees: 16,
    });

    expect(landscape.front.position.z).toBeLessThan(portrait.front.position.z);
    expect(landscape.side.position.x).toBeLessThan(portrait.side.position.x);
  });

  it('首页侧前方视角沿机柜中心旋转并继续对准机柜', () => {
    const result = createMachineCameraPlacements({
      bounds,
      verticalFov: 45,
      aspectRatio: 393 / 768,
      margin: 1.2,
      elevationDegrees: 13,
      frontYawDegrees: 18,
    });

    expect(result.front.rotationY).toBe(18);
    expect(result.front.position.x).toBeCloseTo(4.6835, 3);
    expect(result.front.position.y).toBeCloseTo(6.3641, 3);
    expect(result.front.position.z).toBeCloseTo(14.5993, 3);
  });

  it('游戏正面与侧面保持相同观察距离', () => {
    const result = createMachineCameraPlacements({
      bounds,
      verticalFov: 45,
      aspectRatio: 393 / 852,
      margin: 1.04,
      elevationDegrees: 18,
    });
    const center = { x: 0, z: 0.185 };
    const frontDistance = Math.hypot(
      result.front.position.x - center.x,
      result.front.position.z - center.z,
    );
    const sideDistance = Math.hypot(
      result.side.position.x - center.x,
      result.side.position.z - center.z,
    );

    expect(sideDistance).toBeCloseTo(frontDistance, 6);
    expect(result.side.position.y).toBeCloseTo(result.front.position.y, 6);
  });

  it('拒绝无效的视口和机柜边界', () => {
    expect(() => createMachineCameraPlacements({
      bounds,
      verticalFov: 45,
      aspectRatio: 0,
      margin: 1.08,
      elevationDegrees: 10,
    })).toThrow('invalid camera framing options');
    expect(() => createMachineCameraPlacements({
      bounds: { ...bounds, minX: 3 },
      verticalFov: 45,
      aspectRatio: 1,
      margin: 1.08,
      elevationDegrees: 10,
    })).toThrow('invalid machine view bounds');
  });
});

describe('toggleMachineCameraView', () => {
  it('每次调用都在正面和侧面之间切换', () => {
    const toggle = (cameraFraming as unknown as {
      toggleMachineCameraView?: (current: 'front' | 'side') => 'front' | 'side';
    }).toggleMachineCameraView;

    expect(toggle?.('front')).toBe('side');
    expect(toggle?.('side')).toBe('front');
  });
});

describe('selectMachineCameraPlacement', () => {
  it('根据当前视角返回对应的缓动目标', () => {
    const placements = {
      front: { position: { x: 1, y: 2, z: 3 }, rotationX: -13, rotationY: 18 },
      side: { position: { x: 9, y: 8, z: 7 }, rotationX: -18, rotationY: 90 },
    };

    expect(selectMachineCameraPlacement(placements, 'front')).toEqual(placements.front);
    expect(selectMachineCameraPlacement(placements, 'side')).toEqual(placements.side);
  });
});

describe('interpolateMachineCameraPlacement', () => {
  it('沿圆弧过渡时中点不会靠近机柜', () => {
    const midpoint = interpolateMachineCameraPlacement(
      { position: { x: 0, y: 6, z: 10 }, rotationX: -18, rotationY: 0 },
      { position: { x: 10, y: 6, z: 0 }, rotationX: -18, rotationY: 90 },
      { x: 0, z: 0 },
      0.5,
    );

    expect(midpoint.position.x).toBeCloseTo(Math.sqrt(50), 6);
    expect(midpoint.position.z).toBeCloseTo(Math.sqrt(50), 6);
    expect(Math.hypot(midpoint.position.x, midpoint.position.z)).toBeCloseTo(10, 6);
    expect(midpoint.rotationY).toBeCloseTo(45, 6);
  });
});

describe('getMachineCameraProfile', () => {
  it('首页使用三分之四展示，游戏页使用更近的正面俯视', () => {
    expect(getMachineCameraProfile('home')).toEqual({
      margin: 1.2,
      elevationDegrees: 13,
      yawDegrees: 18,
    });
    expect(getMachineCameraProfile('play')).toEqual({
      margin: 1.04,
      elevationDegrees: 18,
      yawDegrees: 0,
    });
  });
});

function projectFrontBounds(
  subject: MachineViewBounds,
  camera: { position: { x: number; y: number; z: number }; rotationX: number },
  verticalFov: number,
  aspectRatio: number,
): Array<{ x: number; y: number }> {
  const angle = -camera.rotationX * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const tangent = Math.tan(verticalFov * Math.PI / 360);
  const points: Array<{ x: number; y: number }> = [];

  for (const x of [subject.minX, subject.maxX]) {
    for (const y of [subject.minY, subject.maxY]) {
      for (const z of [subject.minZ, subject.maxZ]) {
        const dx = x - camera.position.x;
        const dy = y - camera.position.y;
        const dz = z - camera.position.z;
        const localY = cosine * dy - sine * dz;
        const localZ = sine * dy + cosine * dz;
        const depth = -localZ;
        points.push({
          x: dx / (depth * tangent * aspectRatio),
          y: localY / (depth * tangent),
        });
      }
    }
  }
  return points;
}
