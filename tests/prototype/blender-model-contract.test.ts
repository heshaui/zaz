import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface AssetSummary {
  names: string[];
  objectCount: number;
  triangleCount: number;
  fileSize: number;
}

const root = resolve(import.meta.dirname, '../..');
const blenderCandidates = [
  process.env.BLENDER_PATH,
  'D:\\软件\\Blender\\blender.exe',
  'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe',
].filter((candidate): candidate is string => Boolean(candidate));
const blender = blenderCandidates.find((candidate) => existsSync(candidate));

function inspectModel(): AssetSummary {
  if (!blender) throw new Error('未找到 Blender，请通过 BLENDER_PATH 指定 blender.exe');

  const output = execFileSync(
    blender,
    [
      '--background',
      '--factory-startup',
      '--python',
      resolve(root, 'tools/blender/inspect-prototype-assets.py'),
    ],
    { cwd: root, encoding: 'utf8' },
  );
  const summaryLine = output.split(/\r?\n/).find((line) => line.startsWith('ASSET_CONTRACT='));
  if (!summaryLine) throw new Error('Blender 检查器未输出 ASSET_CONTRACT');
  return JSON.parse(summaryLine.slice('ASSET_CONTRACT='.length)) as AssetSummary;
}

describe('Blender model contract', () => {
  it('exports all stable runtime nodes', () => {
    const summary = inspectModel();
    const requiredNames = [
      'MachineRoot',
      'ClawCarriage',
      'ClawHub',
      'ClawCable',
      'ClawArm_0',
      'ClawArm_1',
      'ClawArm_2',
      'PrizeChuteTarget',
      'PrizeChuteEntry',
      'Dolls',
      'DollRabbit',
    ];

    requiredNames.forEach((name) => expect(summary.names).toContain(name));
  });

  it('stays inside the prototype mobile asset budget', () => {
    const summary = inspectModel();

    expect(summary.objectCount).toBeGreaterThan(20);
    expect(summary.triangleCount).toBeGreaterThan(0);
    expect(summary.triangleCount).toBeLessThan(80_000);
    expect(summary.fileSize).toBeLessThan(8 * 1024 * 1024);
  });

  it('keeps the front play area unobstructed in the exported model', () => {
    const summary = inspectModel();

    expect(summary.names).not.toContain('GlassFront');
  });
});
