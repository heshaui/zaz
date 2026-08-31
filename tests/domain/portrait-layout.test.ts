import { describe, expect, it } from 'vitest';
import { resolvePortraitLayout } from '../../game/assets/scripts/domain/portrait-layout';

describe('resolvePortraitLayout', () => {
  it.each([
    [900, { topHudY: 496, consoleBottomY: -568, consoleCenterY: -418, consoleHeight: 300, machineWindowBottomY: -268, machineWindowTopY: 568, machineWindowHeight: 836 }],
    [1136, { topHudY: 496, consoleBottomY: -568, consoleCenterY: -418, consoleHeight: 300, machineWindowBottomY: -268, machineWindowTopY: 568, machineWindowHeight: 836 }],
    [1280, { topHudY: 568, consoleBottomY: -640, consoleCenterY: -490, consoleHeight: 300, machineWindowBottomY: -340, machineWindowTopY: 640, machineWindowHeight: 980 }],
    [1560, { topHudY: 708, consoleBottomY: -780, consoleCenterY: -630, consoleHeight: 300, machineWindowBottomY: -480, machineWindowTopY: 780, machineWindowHeight: 1260 }],
  ])('resolves visible height %i into stable portrait bands', (visibleHeight, expected) => {
    expect(resolvePortraitLayout(visibleHeight, 0, 0)).toEqual(expected);
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

  it('preserves the minimum machine window when safe areas consume most of a short display', () => {
    expect(resolvePortraitLayout(1136, 300, 300)).toEqual({
      topHudY: 196, consoleBottomY: -452, consoleCenterY: -302, consoleHeight: 300,
      machineWindowBottomY: -152, machineWindowTopY: 268, machineWindowHeight: 420,
    });
  });
});
