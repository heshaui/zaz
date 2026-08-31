import { describe, expect, it } from 'vitest';
import {
  createMachineCameraPlacements,
  getMachineCameraMargin,
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

describe('getMachineCameraMargin', () => {
  it('uses the wide home framing and the closer play framing', () => {
    expect(getMachineCameraMargin('home')).toBe(1.16);
    expect(getMachineCameraMargin('play')).toBe(1.08);
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
