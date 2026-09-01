import { describe, expect, it } from 'vitest';
import {
  PREMIUM_CATALOG,
  presentPremiumCatalog,
} from '../../game/assets/scripts/domain/premium-catalog';

describe('premium catalog', () => {
  it('offers the four exchange choices in display order', () => {
    expect(PREMIUM_CATALOG).toEqual([
      { id: 'premium-rabbit', name: '软萌兔', colorHex: '#F4A6B8', imagePath: 'ui/dolls/premium-rabbit' },
      { id: 'premium-cat', name: '奶油猫', colorHex: '#8DC9C1', imagePath: 'ui/dolls/premium-cat' },
      { id: 'premium-dog', name: '元气犬', colorHex: '#F3CC73', imagePath: 'ui/dolls/premium-dog' },
      { id: 'premium-cow', name: '花花牛', colorHex: '#AAB7E2', imagePath: 'ui/dolls/premium-cow' },
    ]);
  });

  it('presents the owned quantity for every premium prize', () => {
    const view = presentPremiumCatalog({
      'premium-rabbit': 2,
      'premium-cow': 1,
    });

    expect(view.totalOwned).toBe(3);
    expect(view.items.map((item) => ({ id: item.id, ownedText: item.ownedText }))).toEqual([
      { id: 'premium-rabbit', ownedText: '×2' },
      { id: 'premium-cat', ownedText: '×0' },
      { id: 'premium-dog', ownedText: '×0' },
      { id: 'premium-cow', ownedText: '×1' },
    ]);
  });
});
