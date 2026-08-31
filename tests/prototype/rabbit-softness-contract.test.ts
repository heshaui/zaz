import { describe, expect, it } from 'vitest';
import generatorSource from '../../tools/blender/generate-prototype-assets.py?raw';

describe('rabbit plush model contract', () => {
  it('feeds UV coordinates into the packed fabric normal', () => {
    expect(generatorSource).toContain('ShaderNodeTexCoord');
    expect(generatorSource).toContain(
      'texture_coordinates.outputs["UV"], texture.inputs["Vector"]',
    );
  });

  it('adds visible compression creases around the arms', () => {
    expect(generatorSource).toContain('"ArmCreaseL"');
    expect(generatorSource).toContain('"ArmCreaseR"');
  });

  it('uses varied reclining poses instead of an upright preview row', () => {
    const placementBlock = generatorSource.match(
      /placements = \[(.*?)\]\n\s*for /s,
    )?.[1];
    expect(placementBlock).toBeDefined();

    const poses = [
      ...(placementBlock?.matchAll(
        /"location": \(([-\d.]+), ([-\d.]+), ([-\d.]+)\), "rotation": \(([-\d.]+), ([-\d.]+), ([-\d.]+)\)/g,
      ) ?? []),
    ];
    const recliningCount = poses.filter(
      (match) => Number(match[4]) !== 0 || Number(match[5]) !== 0,
    ).length;
    const rightEdgeSidePoses = poses.filter(
      (match) => Number(match[1]) > 1.4 && Math.abs(Number(match[5])) > 60,
    );

    expect(poses).toHaveLength(5);
    expect(recliningCount).toBeGreaterThanOrEqual(4);
    rightEdgeSidePoses.forEach((match) => {
      expect(Number(match[5])).toBeLessThan(0);
    });
  });
});
