import { describe, expect, it } from 'vitest';
import { resolvePortraitLayout } from '../../game/assets/scripts/domain/portrait-layout';

describe('resolvePortraitLayout', () => {
  it.each([
    [900, { topHudY: 378, consoleBottomY: -450, consoleCenterY: -280, consoleHeight: 340, machineWindowBottomY: -110, machineWindowTopY: 450, machineWindowHeight: 560 }],
    [1136, { topHudY: 496, consoleBottomY: -568, consoleCenterY: -398, consoleHeight: 340, machineWindowBottomY: -228, machineWindowTopY: 568, machineWindowHeight: 796 }],
    [1280, { topHudY: 568, consoleBottomY: -640, consoleCenterY: -470, consoleHeight: 340, machineWindowBottomY: -300, machineWindowTopY: 640, machineWindowHeight: 940 }],
    [1560, { topHudY: 708, consoleBottomY: -780, consoleCenterY: -610, consoleHeight: 340, machineWindowBottomY: -440, machineWindowTopY: 780, machineWindowHeight: 1220 }],
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
      topHudY: 568, consoleBottomY: -640, consoleCenterY: -470, consoleHeight: 340,
      machineWindowBottomY: -300, machineWindowTopY: 640, machineWindowHeight: 940,
    });
  });

  it('keeps the machine window visible when positive safe areas reduce the viewport', () => {
    expect(resolvePortraitLayout(1136, 80, 40)).toEqual({
      topHudY: 416, consoleBottomY: -528, consoleCenterY: -358, consoleHeight: 340,
      machineWindowBottomY: -188, machineWindowTopY: 488, machineWindowHeight: 676,
    });
  });

  it('keeps the console inside the real display when safe areas compress the machine window', () => {
    expect(resolvePortraitLayout(1136, 300, 300)).toEqual({
      topHudY: 196, consoleBottomY: -268, consoleCenterY: -98, consoleHeight: 340,
      machineWindowBottomY: 72, machineWindowTopY: 268, machineWindowHeight: 196,
    });
  });

  it('caps oversized bottom insets before they can move the console off screen', () => {
    expect(resolvePortraitLayout(900, 200, 800)).toEqual({
      topHudY: 378, consoleBottomY: 110, consoleCenterY: 280, consoleHeight: 340,
      machineWindowBottomY: 450, machineWindowTopY: 450, machineWindowHeight: 0,
    });
  });

  it('normalizes non-finite layout inputs', () => {
    expect(resolvePortraitLayout(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN)).toEqual({
      topHudY: 568, consoleBottomY: -640, consoleCenterY: -470, consoleHeight: 340,
      machineWindowBottomY: -300, machineWindowTopY: 640, machineWindowHeight: 940,
    });
  });
});
