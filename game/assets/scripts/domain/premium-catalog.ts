export interface PremiumPrize {
  id: string;
  name: string;
  colorHex: string;
}

export const PREMIUM_CATALOG: readonly PremiumPrize[] = [
  { id: 'premium-rabbit', name: '软萌兔', colorHex: '#F4A6B8' },
  { id: 'premium-cat', name: '奶油猫', colorHex: '#8DC9C1' },
  { id: 'premium-dog', name: '元气犬', colorHex: '#F3CC73' },
  { id: 'premium-cow', name: '花花牛', colorHex: '#AAB7E2' },
];
