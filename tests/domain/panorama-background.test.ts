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

describe('getPortraitBackdropDimensions', () => {
  it('竖屏图片覆盖更窄的手机视口时保持图片比例并裁掉左右边缘', () => {
    const calculate = Reflect.get(panoramaBackground, 'getPortraitBackdropDimensions');

    expect(calculate).toBeTypeOf('function');
    expect(calculate({
      distance: 100,
      imageAspectRatio: 9 / 16,
      verticalFovDegrees: 45,
      viewportAspectRatio: 393 / 852,
    })).toEqual({
      height: expect.closeTo(82.8427, 3),
      width: expect.closeTo(46.599, 3),
    });
  });
});

describe('getPortraitBackdropUvs', () => {
  it('纵向翻转图片坐标以匹配 Cocos 图片纹理方向', () => {
    const getUvs = Reflect.get(panoramaBackground, 'getPortraitBackdropUvs');

    expect(getUvs).toBeTypeOf('function');
    expect(getUvs()).toEqual([
      0, 1,
      0, 0,
      1, 0,
      1, 1,
    ]);
  });
});
