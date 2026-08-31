import { describe, expect, it } from 'vitest';
import * as panoramaBackground from '../../game/assets/scripts/domain/panorama-background';

const { isUsableEquirectangularPanorama } = panoramaBackground;

describe('isUsableEquirectangularPanorama', () => {
  it('接受严格或轻微误差范围内的二比一全景图', () => {
    expect(isUsableEquirectangularPanorama(1774, 887)).toBe(true);
    expect(isUsableEquirectangularPanorama(2047, 1024)).toBe(true);
  });

  it('拒绝会在全景球上产生明显变形的普通图片', () => {
    expect(isUsableEquirectangularPanorama(1024, 1024)).toBe(false);
    expect(isUsableEquirectangularPanorama(0, 512)).toBe(false);
    expect(isUsableEquirectangularPanorama(Number.NaN, 512)).toBe(false);
  });
});

describe('panoramaHorizontalOffsetToYawDegrees', () => {
  it('把五分之一圈的水平偏移换算为七十二度', () => {
    const convert = Reflect.get(panoramaBackground, 'panoramaHorizontalOffsetToYawDegrees');

    expect(convert).toBeTypeOf('function');
    expect(convert(0.2)).toBe(72);
  });
});
