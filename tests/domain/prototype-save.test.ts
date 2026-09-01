import { describe, expect, it } from 'vitest';
import { HOME_MACHINES } from '../../game/assets/scripts/domain/home-machine-selection';
import {
  loadPrototypePlayerState,
  parsePrototypePlayerState,
  savePrototypePlayerState,
  type PrototypePlayerState,
  type PrototypeSaveOptions,
  type PrototypeStoragePort,
} from '../../game/assets/scripts/domain/prototype-save';

const options: PrototypeSaveOptions = {
  machines: HOME_MACHINES,
  strongMaxAttempts: 10,
  random: () => 0.4,
};

const state: PrototypePlayerState = {
  coins: 42,
  ordinaryDolls: 7,
  premiumDolls: { 'premium-rabbit': 2, 'premium-cat': 1 },
  selectedMachineId: 'strawberry-cat',
  machines: {
    'moon-rabbit': {
      progress: 3,
      strongTarget: 7,
      layoutSequence: 1,
      remainingDolls: 5,
    },
    'strawberry-cat': {
      progress: 1,
      strongTarget: 4,
      layoutSequence: 2,
      remainingDolls: 6,
    },
  },
};

describe('prototype player save', () => {
  it('第 3 版写入后可以完整恢复共享资产和两台机状态', () => {
    let value: string | null = null;
    let savedKey = '';
    const storage: PrototypeStoragePort = {
      getItem: () => value,
      setItem: (key, nextValue) => {
        savedKey = key;
        value = nextValue;
      },
    };

    expect(savePrototypePlayerState(storage, state, options)).toBe(true);
    expect(loadPrototypePlayerState(storage, options)).toEqual(state);
    expect(savedKey).toBe('virtual-claw-game.player.v1');
  });

  it('第 2 版数据升级后原轮次归入月亮兔仓', () => {
    const legacyState = {
      coins: 42,
      progress: 3,
      strongTarget: 7,
      ordinaryDolls: 7,
      premiumDolls: { 'premium-rabbit': 2 },
    };

    expect(parsePrototypePlayerState(JSON.stringify({
      version: 2,
      state: legacyState,
    }), options)).toEqual({
      coins: 42,
      ordinaryDolls: 7,
      premiumDolls: { 'premium-rabbit': 2 },
      selectedMachineId: 'moon-rabbit',
      machines: {
        'moon-rabbit': {
          progress: 3,
          strongTarget: 7,
          layoutSequence: 0,
          remainingDolls: 8,
        },
        'strawberry-cat': {
          progress: 0,
          strongTarget: 5,
          layoutSequence: 0,
          remainingDolls: 8,
        },
      },
    });
  });

  it('第 1 版缺少目标时只从月亮兔仓尚未经过的次数中生成', () => {
    const result = parsePrototypePlayerState(JSON.stringify({
      version: 1,
      state: {
        coins: 42,
        progress: 3,
        ordinaryDolls: 7,
        premiumDolls: {},
      },
    }), options);

    expect(result?.machines['moon-rabbit']).toEqual({
      progress: 3,
      strongTarget: 6,
      layoutSequence: 0,
      remainingDolls: 8,
    });
  });

  it('保留当前目录外但字段有效的机台数据', () => {
    const rawState = {
      ...state,
      machines: {
        ...state.machines,
        'seasonal-old': {
          progress: 2,
          strongTarget: 6,
          layoutSequence: 4,
          remainingDolls: 3,
        },
      },
    };

    expect(parsePrototypePlayerState(JSON.stringify({
      version: 3,
      state: rawState,
    }), options)?.machines['seasonal-old']).toEqual(rawState.machines['seasonal-old']);
  });

  it('已上架机台的单项数据异常时只重建该机台', () => {
    const rawState = {
      ...state,
      machines: {
        ...state.machines,
        'strawberry-cat': {
          progress: 1,
          strongTarget: 4,
          layoutSequence: 2,
          remainingDolls: -1,
        },
      },
    };

    expect(parsePrototypePlayerState(JSON.stringify({
      version: 3,
      state: rawState,
    }), options)).toMatchObject({
      coins: 42,
      selectedMachineId: 'strawberry-cat',
      machines: {
        'moon-rabbit': state.machines['moon-rabbit'],
        'strawberry-cat': {
          progress: 0,
          strongTarget: 5,
          layoutSequence: 0,
          remainingDolls: 8,
        },
      },
    });
  });

  it('当前选择无效时回到目录第一台机', () => {
    expect(parsePrototypePlayerState(JSON.stringify({
      version: 3,
      state: { ...state, selectedMachineId: 'missing-machine' },
    }), options)?.selectedMachineId).toBe('moon-rabbit');
  });

  it.each([
    null,
    '{bad json',
    JSON.stringify({ version: 4, state }),
    JSON.stringify({ version: 3, state: { ...state, coins: -1 } }),
    JSON.stringify({
      version: 3,
      state: { ...state, premiumDolls: { 'premium-rabbit': 0 } },
    }),
    JSON.stringify({ version: 2, state: { ...state, strongTarget: 0 } }),
  ])('共享内容或外层版本异常时返回空结果', (raw) => {
    expect(parsePrototypePlayerState(raw, options)).toBeNull();
  });

  it('本地存储不可用时不影响游戏继续启动', () => {
    const storage: PrototypeStoragePort = {
      getItem: () => { throw new Error('storage unavailable'); },
      setItem: () => { throw new Error('storage unavailable'); },
    };

    expect(loadPrototypePlayerState(storage, options)).toBeNull();
    expect(savePrototypePlayerState(storage, state, options)).toBe(false);
  });
});
