import { describe, expect, it } from 'vitest';
import { UI_COLORS, UI_SIZES } from '../../game/assets/scripts/ui/ui-theme';

describe('UI theme', () => {
  it('provides the shared portrait palette and control measurements', () => {
    expect(UI_COLORS).toEqual({
      aqua: '#15B8BE', coral: '#EF607D', gold: '#FFC83D',
      violet: '#7764B2', ink: '#18242E', paper: '#F8FBFC',
    });
    expect(UI_SIZES).toEqual({
      designWidth: 720, designHeight: 1280, consoleHeight: 300,
      joystickDiameter: 188, dropButtonDiameter: 192, utilityButtonSize: 88,
      outlineWidth: 8,
    });
  });
});
