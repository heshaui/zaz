import { describe, expect, it } from 'vitest';
import machineConfigSource from '../../game/assets/scripts/prototype/machine-config.ts?raw';
import prototypeCoordinatorSource from '../../game/assets/scripts/prototype/prototype-coordinator.ts?raw';

interface HslColor {
  lightness: number;
  saturation: number;
}

function extractDollPalette(): Array<[number, number, number]> {
  const paletteSource = machineConfigSource.match(
    /readonly dollColors = \[([\s\S]*?)\n  \];/,
  )?.[1] ?? '';
  return Array.from(
    paletteSource.matchAll(/new Color\((\d+), (\d+), (\d+), 255\)/g),
    (match) => [Number(match[1]), Number(match[2]), Number(match[3])],
  );
}

function toHsl([red, green, blue]: [number, number, number]): HslColor {
  const channels = [red, green, blue].map((channel) => channel / 255);
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const lightness = (maximum + minimum) / 2;
  const difference = maximum - minimum;
  const saturation = difference === 0
    ? 0
    : difference / (1 - Math.abs(2 * lightness - 1));
  return { lightness, saturation };
}

describe('doll palette contract', () => {
  it('四种主体色都保持鲜亮治愈的明度与饱和度', () => {
    const palette = extractDollPalette();

    expect(palette).toHaveLength(4);
    palette.forEach((rgb) => {
      const color = toHsl(rgb);
      expect(color.lightness).toBeGreaterThanOrEqual(0.62);
      expect(color.saturation).toBeGreaterThanOrEqual(0.6);
    });
  });

  it('主体材质使用同色低强度柔光提亮暗部', () => {
    expect(prototypeCoordinatorSource).toContain(
      "material.setProperty('emissive', dollColor);",
    );
    expect(prototypeCoordinatorSource).toContain(
      "material.setProperty('emissiveScale', new Vec3(0.3, 0.3, 0.3));",
    );
  });
});
