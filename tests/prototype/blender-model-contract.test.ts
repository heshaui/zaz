import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface AssetSummary {
  names: string[];
  objectCount: number;
  triangleCount: number;
  fileSize: number;
  dollPartCounts: Record<string, number>;
}

const root = resolve(import.meta.dirname, '../..');
const blenderCandidates = [
  process.env.BLENDER_PATH,
  'D:\\软件\\Blender-5.2\\blender.exe',
  'D:\\软件\\Blender\\blender.exe',
  'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe',
].filter((candidate): candidate is string => Boolean(candidate));
const blender = blenderCandidates.find((candidate) => existsSync(candidate));
const summaries = new Map<string, AssetSummary>();

function inspectModel(machineId: string): AssetSummary {
  const cached = summaries.get(machineId);
  if (cached) return cached;
  if (!blender) throw new Error('未找到 Blender，请通过 BLENDER_PATH 指定 blender.exe');

  const output = execFileSync(
    blender,
    [
      '--background',
      '--factory-startup',
      '--python',
      resolve(root, 'tools/blender/inspect-prototype-assets.py'),
      '--',
      '--machine',
      machineId,
    ],
    { cwd: root, encoding: 'utf8' },
  );
  const summaryLine = output.split(/\r?\n/).find((line) => line.startsWith('ASSET_CONTRACT='));
  if (!summaryLine) throw new Error('Blender 检查器未输出 ASSET_CONTRACT');
  const summary = JSON.parse(summaryLine.slice('ASSET_CONTRACT='.length)) as AssetSummary;
  summaries.set(machineId, summary);
  return summary;
}

const machines = [
  { id: 'moon-rabbit', doll: 'DollRabbit' },
  { id: 'strawberry-cat', doll: 'DollCat' },
] as const;

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
];

describe('Blender model contract', () => {
  it.each(machines)('$id 导出全部稳定运行节点', ({ id }) => {
    const summary = inspectModel(id);
    requiredNames.forEach((name) => expect(summary.names).toContain(name));
  });

  it.each(machines)('$id 只导出指定的普通娃娃模板', ({ id, doll }) => {
    const summary = inspectModel(id);
    expect(Object.keys(summary.dollPartCounts)).toEqual([doll]);
    expect(summary.dollPartCounts[doll]).toBeGreaterThanOrEqual(12);
  });

  it('草莓猫舍包含猫耳、猫爪灯牌、草莓和毛线球装饰', () => {
    const names = inspectModel('strawberry-cat').names;

    ['CatEarCanopy', 'CatPawSign', 'StrawberryBackboard', 'YarnBallBackboard']
      .forEach((name) => expect(names).toContain(name));
  });

  it('两份模型分别和合计保持在移动端资源预算内', () => {
    const assets = machines.map(({ id }) => inspectModel(id));
    assets.forEach((summary) => {
      expect(summary.objectCount).toBeGreaterThan(20);
      expect(summary.triangleCount).toBeGreaterThan(0);
      expect(summary.triangleCount).toBeLessThan(80_000);
      expect(summary.fileSize).toBeLessThan(4 * 1024 * 1024);
    });
    expect(assets.reduce((total, summary) => total + summary.fileSize, 0))
      .toBeLessThan(8 * 1024 * 1024);
  });

  it.each(machines)('$id 正面操作区保持开放', ({ id }) => {
    expect(inspectModel(id).names).not.toContain('GlassFront');
  });
});
