import { describe, expect, it } from 'vitest';
import * as saveModule from '../../game/assets/scripts/domain/prototype-save';

interface PlayerState {
  coins: number;
  progress: number;
  strongTarget?: number;
  ordinaryDolls: number;
  premiumDolls: Record<string, number>;
}

interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const api = saveModule as unknown as {
  parsePrototypePlayerState?: (raw: string | null) => PlayerState | null;
  loadPrototypePlayerState?: (storage: StoragePort) => PlayerState | null;
  savePrototypePlayerState?: (storage: StoragePort, state: PlayerState) => boolean;
};

const state: PlayerState = {
  coins: 42,
  progress: 3,
  strongTarget: 7,
  ordinaryDolls: 7,
  premiumDolls: { 'premium-rabbit': 2, 'premium-cat': 1 },
};

describe('prototype player save', () => {
  it('写入后可以完整恢复玩家资产', () => {
    let value: string | null = null;
    let savedKey = '';
    const storage: StoragePort = {
      getItem: () => value,
      setItem: (key, nextValue) => {
        savedKey = key;
        value = nextValue;
      },
    };

    expect(api.savePrototypePlayerState?.(storage, state)).toBe(true);
    expect(api.loadPrototypePlayerState?.(storage)).toEqual(state);
    expect(savedKey).toBe('virtual-claw-game.player.v1');
  });

  it('兼容旧格式并保留已有周期进度', () => {
    const legacyState = {
      coins: 42,
      progress: 3,
      ordinaryDolls: 7,
      premiumDolls: { 'premium-rabbit': 2 },
    };

    expect(api.parsePrototypePlayerState?.(JSON.stringify({
      version: 1,
      state: legacyState,
    }))).toEqual(legacyState);
  });

  it.each([
    null,
    '{bad json',
    JSON.stringify({ version: 3, state }),
    JSON.stringify({ version: 1, state: { ...state, coins: -1 } }),
    JSON.stringify({
      version: 1,
      state: { ...state, premiumDolls: { 'premium-rabbit': 0 } },
    }),
    JSON.stringify({ version: 2, state: { ...state, strongTarget: 0 } }),
  ])('异常内容返回空结果', (raw) => {
    expect(api.parsePrototypePlayerState?.(raw)).toBeNull();
  });

  it('本地存储不可用时不影响游戏继续启动', () => {
    const storage: StoragePort = {
      getItem: () => { throw new Error('storage unavailable'); },
      setItem: () => { throw new Error('storage unavailable'); },
    };

    expect(api.loadPrototypePlayerState?.(storage)).toBeNull();
    expect(api.savePrototypePlayerState?.(storage, state)).toBe(false);
  });
});
