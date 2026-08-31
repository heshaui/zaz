import { describe, expect, it } from 'vitest';
import generatorSource from '../../tools/blender/generate-prototype-assets.py?raw';

describe('prize chute flap model contract', () => {
  it('keeps separate pivot and panel nodes for later animation', () => {
    expect(generatorSource).toContain('"PrizeChuteFlapPivot"');
    expect(generatorSource).toContain('"PrizeChuteFlap"');
  });
});
