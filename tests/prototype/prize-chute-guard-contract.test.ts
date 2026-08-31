import { describe, expect, it } from 'vitest';
import generatorSource from '../../tools/blender/generate-prototype-assets.py?raw';

describe('prize chute guard model contract', () => {
  it('uses the cabinet glass as the left wall and adds only front and right panels', () => {
    expect(generatorSource).toContain('"PrizeChuteGuardRoot"');
    expect(generatorSource).toContain('"PrizeChuteGuardFront"');
    expect(generatorSource).toContain('"PrizeChuteGuardRight"');
    expect(generatorSource).not.toContain('"PrizeChuteGuardLeft"');
  });

  it('places the front panel on the inner edge of the chute', () => {
    expect(generatorSource).toContain(
      '"PrizeChuteGuardFront", (x, -0.48, guard_z)',
    );
    expect(generatorSource).toContain(
      '"PrizeChuteGuardFrontTop", (x, -0.48, 2.08)',
    );
  });
});
