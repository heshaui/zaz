const GLASS_OPACITY: Readonly<Record<string, number>> = {
  CabinetGlass: 0.16,
  PrizeGuardGlass: 0.28,
  PrizeFlapGlass: 0.34,
};

export function getGlassOpacity(materialName: string): number | null {
  return GLASS_OPACITY[materialName] ?? null;
}
