import { describe, expect, it } from 'vitest';
import {
  resolveCoverSize,
  resolvePortraitLayout,
  resolveSafeAreaInsets,
} from '../../game/assets/scripts/domain/portrait-layout';

interface FullscreenOverlaySubject {
  resolveFullscreenOverlaySize?: (
    viewportWidth: number,
    viewportHeight: number,
  ) => { width: number; height: number };
}

interface GameUtilityLayoutSubject {
  resolveGameUtilityControlLayout?: (
    topHudY: number,
    consoleCenterY: number,
  ) => {
    camera: { x: number; y: number };
    settings: { x: number; y: number };
  };
}

describe('resolveFullscreenOverlaySize', () => {
  it('uses the complete long-screen viewport instead of the fixed design height', async () => {
    const subject = await import('../../game/assets/scripts/domain/portrait-layout') as FullscreenOverlaySubject;

    expect(subject.resolveFullscreenOverlaySize?.(720, 1560)).toEqual({
      width: 720,
      height: 1560,
    });
  });

  it('falls back to the design canvas only for invalid viewport values', async () => {
    const subject = await import('../../game/assets/scripts/domain/portrait-layout') as FullscreenOverlaySubject;

    expect(subject.resolveFullscreenOverlaySize?.(0, Number.NaN)).toEqual({
      width: 720,
      height: 1280,
    });
  });
});

describe('resolveGameUtilityControlLayout', () => {
  it('keeps the view button clear of the ordinary-doll counter', async () => {
    const subject = await import('../../game/assets/scripts/domain/portrait-layout') as GameUtilityLayoutSubject;
    const topHudY = 520;
    const consoleCenterY = -470;
    const layout = subject.resolveGameUtilityControlLayout?.(topHudY, consoleCenterY);

    expect(layout).toBeDefined();
    // 普通娃娃文字最右侧为 258；设置按钮半径为 38。
    expect(layout!.settings.x - 38).toBeGreaterThanOrEqual(258);
    // 信息栏文字半高为 30，视角按钮半径为 44，二者还需留出可见间距。
    const cameraWorldY = consoleCenterY + layout!.camera.y;
    expect(Math.abs(cameraWorldY - topHudY)).toBeGreaterThanOrEqual(86);
  });
});

describe('resolveCoverSize', () => {
  it.each([
    { viewport: [720, 1280], expected: { width: 720, height: 1280 } },
    { viewport: [720, 1560], expected: { width: 877.5, height: 1560 } },
    { viewport: [720, 1136], expected: { width: 720, height: 1280 } },
  ])('covers a $viewport viewport without leaving empty bands', ({ viewport, expected }) => {
    expect(resolveCoverSize(viewport[0], viewport[1], 9 / 16)).toEqual(expected);
  });

  it('falls back to the design canvas for invalid values', () => {
    expect(resolveCoverSize(Number.NaN, -1, 0)).toEqual({ width: 720, height: 1280 });
  });
});

describe('resolvePortraitLayout', () => {
  it('直接使用 Cocos 已换算到设计坐标的安全区域', () => {
    expect(resolveSafeAreaInsets(1558, { y: 34, height: 1446 })).toEqual({
      top: 78,
      bottom: 34,
    });
  });

  it.each([
    [900, { topHudY: 378, consoleBottomY: -450, consoleCenterY: -300, consoleHeight: 300, machineWindowBottomY: -150, machineWindowTopY: 450, machineWindowHeight: 600 }],
    [1136, { topHudY: 496, consoleBottomY: -568, consoleCenterY: -418, consoleHeight: 300, machineWindowBottomY: -268, machineWindowTopY: 568, machineWindowHeight: 836 }],
    [1280, { topHudY: 568, consoleBottomY: -640, consoleCenterY: -490, consoleHeight: 300, machineWindowBottomY: -340, machineWindowTopY: 640, machineWindowHeight: 980 }],
    [1560, { topHudY: 708, consoleBottomY: -780, consoleCenterY: -630, consoleHeight: 300, machineWindowBottomY: -480, machineWindowTopY: 780, machineWindowHeight: 1260 }],
  ])('resolves visible height %i into stable portrait bands', (visibleHeight, expected) => {
    expect(resolvePortraitLayout(visibleHeight, 0, 0)).toEqual(expected);
  });

  it('首页使用更矮的底座，为完整机台保留更多展示高度', () => {
    expect(resolvePortraitLayout(1280, 0, 0, 'home')).toEqual({
      topHudY: 568, consoleBottomY: -640, consoleCenterY: -515, consoleHeight: 250,
      machineWindowBottomY: -390, machineWindowTopY: 640, machineWindowHeight: 1030,
    });
  });

  it('clamps negative safe-area values before positioning content', () => {
    expect(resolvePortraitLayout(1280, -10, -20)).toEqual({
      topHudY: 568, consoleBottomY: -640, consoleCenterY: -490, consoleHeight: 300,
      machineWindowBottomY: -340, machineWindowTopY: 640, machineWindowHeight: 980,
    });
  });

  it('keeps the machine window visible when positive safe areas reduce the viewport', () => {
    expect(resolvePortraitLayout(1136, 80, 40)).toEqual({
      topHudY: 416, consoleBottomY: -528, consoleCenterY: -378, consoleHeight: 300,
      machineWindowBottomY: -228, machineWindowTopY: 488, machineWindowHeight: 716,
    });
  });

  it('keeps the console inside the real display when safe areas compress the machine window', () => {
    expect(resolvePortraitLayout(1136, 300, 300)).toEqual({
      topHudY: 196, consoleBottomY: -268, consoleCenterY: -118, consoleHeight: 300,
      machineWindowBottomY: 32, machineWindowTopY: 268, machineWindowHeight: 236,
    });
  });

  it('caps oversized bottom insets before they can move the console off screen', () => {
    expect(resolvePortraitLayout(900, 200, 800)).toEqual({
      topHudY: 378, consoleBottomY: 150, consoleCenterY: 300, consoleHeight: 300,
      machineWindowBottomY: 450, machineWindowTopY: 450, machineWindowHeight: 0,
    });
  });

  it('normalizes non-finite layout inputs', () => {
    expect(resolvePortraitLayout(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN)).toEqual({
      topHudY: 568, consoleBottomY: -640, consoleCenterY: -490, consoleHeight: 300,
      machineWindowBottomY: -340, machineWindowTopY: 640, machineWindowHeight: 980,
    });
  });
});
