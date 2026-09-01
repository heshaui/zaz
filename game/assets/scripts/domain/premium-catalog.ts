export interface PremiumPrize {
  id: string;
  name: string;
  colorHex: string;
  imagePath: string;
}

export interface PremiumPrizeView extends PremiumPrize {
  ownedCount: number;
  ownedText: string;
}

export interface PremiumCatalogView {
  totalOwned: number;
  items: readonly PremiumPrizeView[];
}

export const PREMIUM_CATALOG: readonly PremiumPrize[] = [
  { id: 'premium-rabbit', name: '软萌兔', colorHex: '#F4A6B8', imagePath: 'ui/dolls/premium-rabbit' },
  { id: 'premium-cat', name: '奶油猫', colorHex: '#8DC9C1', imagePath: 'ui/dolls/premium-cat' },
  { id: 'premium-dog', name: '元气犬', colorHex: '#F3CC73', imagePath: 'ui/dolls/premium-dog' },
  { id: 'premium-cow', name: '花花牛', colorHex: '#AAB7E2', imagePath: 'ui/dolls/premium-cow' },
];

export function presentPremiumCatalog(
  premiumDolls: Readonly<Record<string, number>>,
): PremiumCatalogView {
  const items = PREMIUM_CATALOG.map((prize) => {
    const ownedCount = premiumDolls[prize.id] ?? 0;
    return { ...prize, ownedCount, ownedText: `×${ownedCount}` };
  });
  return {
    totalOwned: items.reduce((total, item) => total + item.ownedCount, 0),
    items,
  };
}
