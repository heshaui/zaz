import { describe, expect, it } from 'vitest';
import { getGlassOpacity } from '../../game/assets/scripts/domain/glass-material';

describe('getGlassOpacity', () => {
  it.each([
    ['CabinetGlass', 0.16],
    ['PrizeGuardGlass', 0.28],
    ['PrizeFlapGlass', 0.34],
  ])('为机台玻璃材质返回可见但通透的透明度', (name, opacity) => {
    expect(getGlassOpacity(name)).toBe(opacity);
  });

  it('普通材质不参与玻璃透明处理', () => {
    expect(getGlassOpacity('ClawMetal')).toBeNull();
  });
});
