import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import bootSceneSource from '../../game/assets/scenes/boot.scene?raw';

interface SceneRecord {
  __type__?: string;
  _globals?: { __id__?: number } | null;
  shadows?: { __id__?: number } | null;
}

describe('boot scene rendering contract', () => {
  it('provides scene globals and shadow settings before runtime graphics render', () => {
    const records = JSON.parse(bootSceneSource) as SceneRecord[];
    const scene = records.find((record) => record.__type__ === 'cc.Scene');
    const globalsId = scene?._globals?.__id__;
    const globals = globalsId === undefined ? undefined : records[globalsId];
    const shadowsId = globals?.shadows?.__id__;

    expect(globals?.__type__).toBe('cc.SceneGlobals');
    expect(shadowsId === undefined ? undefined : records[shadowsId]?.__type__).toBe('cc.ShadowsInfo');
  });

  it('uses a portrait loading background that exactly matches the 9:16 canvas ratio', () => {
    const imagePath = resolve(
      process.cwd(),
      'game/assets/resources/backgrounds/loading-dream-arcade-portrait.png',
    );
    const png = readFileSync(imagePath);

    // PNG 文件头中的宽高采用大端序，直接读取即可避免引入图片解析依赖。
    expect(png.readUInt32BE(16)).toBe(864);
    expect(png.readUInt32BE(20)).toBe(1536);
  });
});
