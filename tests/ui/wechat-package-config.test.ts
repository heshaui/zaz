import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readJson(path: string): Record<string, any> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;
}

describe('wechat package configuration', () => {
  it('keeps the main, engine and resources assets outside the initial package', () => {
    const platformProfile = readJson('game/profiles/v2/packages/wechatgame.json');
    const builderProfile = readJson('game/profiles/v2/packages/builder.json');
    const builderSettings = readJson('game/settings/v2/packages/builder.json');
    const resourcesMeta = readJson('game/assets/resources.meta');

    [platformProfile.builder.common, builderProfile.common].forEach((common) => {
      expect(common.mainBundleCompressionType).toBe('subpackage');
    });
    expect(resourcesMeta.userData).toMatchObject({
      isBundle: true,
      bundleName: 'resources',
      priority: 8,
      bundleConfigID: 'default',
    });
    const resourcesBundleConfig =
      builderSettings.bundleConfig.custom[resourcesMeta.userData.bundleConfigID];
    expect(resourcesBundleConfig.configs.miniGame).toMatchObject({
      configMode: 'overwrite',
      overwriteSettings: {
        wechatgame: {
          compressionType: 'subpackage',
        },
      },
    });
  });
});
