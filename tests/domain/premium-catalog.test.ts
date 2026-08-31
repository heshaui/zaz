import { describe, expect, it } from 'vitest';
import { PREMIUM_CATALOG } from '../../game/assets/scripts/domain/premium-catalog';

describe('premium catalog', () => {
  it('offers the four exchange choices in display order', () => {
    expect(PREMIUM_CATALOG).toEqual([
      { id: 'premium-rabbit', name: '软萌兔', colorHex: '#F4A6B8' },
      { id: 'premium-cat', name: '奶油猫', colorHex: '#8DC9C1' },
      { id: 'premium-dog', name: '元气犬', colorHex: '#F3CC73' },
      { id: 'premium-cow', name: '花花牛', colorHex: '#AAB7E2' },
    ]);
  });
});
