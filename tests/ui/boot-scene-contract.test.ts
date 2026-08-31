import { describe, expect, it } from 'vitest';
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
});
