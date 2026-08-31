import { describe, expect, it } from 'vitest';
import { PrototypeStore } from '../../game/assets/scripts/domain/prototype-store';

describe('PrototypeStore', () => {
  it('开始一局只扣除统一价格，不提前推进周期', () => {
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 5,
      random: () => 0.4,
    });

    expect(store.startAttempt()).toEqual({ coins: 27 });
    expect(store.snapshot()).toMatchObject({
      coins: 27,
      cost: 3,
      attemptState: 'ready',
    });
    expect(store.snapshot()).not.toHaveProperty('progress');
    expect(store.snapshot()).not.toHaveProperty('chargeStage');
  });

  it('下爪前后公开可供界面使用的一局状态', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, strongMaxAttempts: 5 });

    expect(store.snapshot().attemptState).toBe('waiting');
    store.startAttempt();
    expect(store.snapshot().attemptState).toBe('ready');
    store.executeDrop();
    expect(store.snapshot().attemptState).toBe('running');
    store.settleAttempt(false);
    expect(store.snapshot().attemptState).toBe('waiting');
  });

  it('投币后可放弃本局，保留扣除的币且不推进周期', () => {
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 5,
      random: () => 0.4,
    });

    store.startAttempt();
    store.abandonAttempt();

    expect(store.snapshot()).toMatchObject({ coins: 27, attemptState: 'waiting' });
    expect(store.exportPlayerState()).toMatchObject({ progress: 0, ordinaryDolls: 0 });
  });

  it('只允许在下爪前放弃已投币的一局', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, strongMaxAttempts: 5 });

    expect(() => store.abandonAttempt()).toThrow('abandon is not allowed');
    store.startAttempt();
    store.executeDrop();
    expect(() => store.abandonAttempt()).toThrow('abandon is not allowed');
  });

  it('余额不足时保持所有数据不变', () => {
    const store = new PrototypeStore({ coins: 2, cost: 3, strongMaxAttempts: 5 });

    expect(() => store.startAttempt()).toThrow('insufficient coins');
    expect(store.snapshot()).toMatchObject({ coins: 2, attemptState: 'waiting' });
  });

  it('同一时间只允许存在一个未完成回合', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, strongMaxAttempts: 5 });
    store.startAttempt();

    expect(() => store.startAttempt()).toThrow('attempt already open');
    expect(store.snapshot().coins).toBe(27);
  });

  it('强爪成功后增加一个普通娃娃', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, strongMaxAttempts: 1 });
    store.startAttempt();

    expect(store.executeDrop()).toEqual({ isStrong: true });
    store.settleAttempt(true);

    expect(store.snapshot().ordinaryDolls).toBe(1);
  });

  it('普通力度没有进入出口时不增加娃娃', () => {
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 5,
      random: () => 0.4,
    });
    store.startAttempt();

    expect(store.executeDrop()).toEqual({ isStrong: false });
    store.settleAttempt(false);

    expect(store.snapshot().ordinaryDolls).toBe(0);
  });

  it('普通力度最终进入出口时增加一个娃娃', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, strongMaxAttempts: 5 });
    store.startAttempt();
    store.executeDrop();

    store.settleAttempt(true);

    expect(store.snapshot().ordinaryDolls).toBe(1);
  });

  it('每个周期按隐藏目标决定完整力度并重新生成目标', () => {
    const randomValues = [0.4, 0.999999];
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 5,
      random: () => randomValues.shift() ?? 0,
    });

    const runAttempt = () => {
      store.startAttempt();
      const result = store.executeDrop();
      store.settleAttempt(false);
      return result;
    };

    expect(runAttempt()).toEqual({ isStrong: false });
    expect(runAttempt()).toEqual({ isStrong: false });
    expect(runAttempt()).toEqual({ isStrong: true });
    expect(store.exportPlayerState()).toMatchObject({
      progress: 0,
      strongTarget: 5,
    });
  });

  it('重新载入后延续原有隐藏目标', () => {
    const firstStore = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 5,
      random: () => 0.999999,
      playerState: {
        coins: 30,
        progress: 1,
        strongTarget: 3,
        ordinaryDolls: 0,
        premiumDolls: {},
      },
    });
    firstStore.startAttempt();
    expect(firstStore.executeDrop()).toEqual({ isStrong: false });
    firstStore.settleAttempt(false);

    const secondStore = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 5,
      random: () => 0.999999,
      playerState: firstStore.exportPlayerState(),
    });
    secondStore.startAttempt();
    expect(secondStore.executeDrop()).toEqual({ isStrong: true });
  });

  it('旧存档只从尚未经过的次数中生成隐藏目标', () => {
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 10,
      random: () => 0,
      playerState: {
        coins: 30,
        progress: 3,
        ordinaryDolls: 0,
        premiumDolls: {},
      },
    });

    expect(store.exportPlayerState()).toMatchObject({
      progress: 3,
      strongTarget: 4,
    });
    store.startAttempt();
    expect(store.executeDrop()).toEqual({ isStrong: true });
  });

  it('配置上限降低后最迟在新上限使用完整力度', () => {
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 7,
      random: () => 0,
      playerState: {
        coins: 30,
        progress: 6,
        strongTarget: 9,
        ordinaryDolls: 0,
        premiumDolls: {},
      },
    });

    store.startAttempt();
    expect(store.executeDrop()).toEqual({ isStrong: true });
  });

  it('强爪操作失误不会发娃娃且周期已经归零', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, strongMaxAttempts: 1 });
    store.startAttempt();
    store.executeDrop();
    store.settleAttempt(false);

    expect(store.exportPlayerState()).toMatchObject({ ordinaryDolls: 0, progress: 0 });
  });

  it('拒绝重复执行下爪或未下爪直接结算', () => {
    const store = new PrototypeStore({ coins: 30, cost: 3, strongMaxAttempts: 5 });
    store.startAttempt();

    expect(() => store.settleAttempt(true)).toThrow('attempt is not ready to settle');
    store.executeDrop();
    expect(() => store.executeDrop()).toThrow('drop is not allowed');
  });

  it('按配置门槛消耗普通娃娃并记录所选精品', () => {
    const store = new PrototypeStore({
      coins: 300,
      cost: 3,
      strongMaxAttempts: 1,
      exchangeCost: 4,
    });
    for (let i = 0; i < 4; i += 1) {
      store.startAttempt();
      store.executeDrop();
      store.settleAttempt(true);
    }

    store.exchange('premium-rabbit');

    expect(store.snapshot()).toMatchObject({
      ordinaryDolls: 0,
      exchangeCost: 4,
      premiumDolls: { 'premium-rabbit': 1 },
    });
  });

  it('重复选择同一种精品时累计数量', () => {
    const store = new PrototypeStore({
      coins: 300,
      cost: 3,
      strongMaxAttempts: 1,
      exchangeCost: 2,
    });
    for (let i = 0; i < 6; i += 1) {
      store.startAttempt();
      store.executeDrop();
      store.settleAttempt(true);
    }

    store.exchange('premium-rabbit');
    store.exchange('premium-rabbit');
    store.exchange('premium-cat');

    expect(store.snapshot()).toMatchObject({
      ordinaryDolls: 0,
      premiumDolls: {
        'premium-rabbit': 2,
        'premium-cat': 1,
      },
    });
  });

  it('普通娃娃不足时不能兑换', () => {
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 1,
      exchangeCost: 3,
    });

    expect(() => store.exchange('premium-rabbit')).toThrow(
      'insufficient ordinary dolls',
    );
    expect(store.snapshot()).toMatchObject({ ordinaryDolls: 0, premiumDolls: {} });
  });

  it('已经投币时不能同时兑换', () => {
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 1,
      exchangeCost: 1,
    });
    store.startAttempt();
    store.executeDrop();
    store.settleAttempt(true);
    store.startAttempt();

    expect(() => store.exchange('premium-rabbit')).toThrow(
      'exchange is not allowed during attempt',
    );
    expect(store.snapshot()).toMatchObject({
      ordinaryDolls: 1,
      premiumDolls: {},
      attemptState: 'ready',
    });
  });

  it('拒绝无效兑换门槛', () => {
    expect(() => new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 1,
      exchangeCost: 0,
    })).toThrow('exchange cost must be >= 1');
  });

  it('拒绝无效最大次数', () => {
    expect(() => new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 0,
    })).toThrow('max attempts must be >= 1');
  });

  it('使用保存的玩家资产和最新机台规则重新载入', () => {
    const store = new PrototypeStore({
      coins: 300,
      cost: 5,
      strongMaxAttempts: 8,
      random: () => 0,
      exchangeCost: 12,
      playerState: {
        coins: 42,
        progress: 3,
        strongTarget: 6,
        ordinaryDolls: 7,
        premiumDolls: { 'premium-rabbit': 2 },
      },
    } as ConstructorParameters<typeof PrototypeStore>[0]);

    expect(store.snapshot()).toMatchObject({
      coins: 42,
      cost: 5,
      ordinaryDolls: 7,
      premiumDolls: { 'premium-rabbit': 2 },
      exchangeCost: 12,
      attemptState: 'waiting',
    });
  });

  it('只在稳定状态导出玩家资产', () => {
    const store = new PrototypeStore({
      coins: 30,
      cost: 3,
      strongMaxAttempts: 2,
      exchangeCost: 1,
      random: () => 0.75,
    });
    const exportState = () => (
      store as unknown as { exportPlayerState?: () => unknown }
    ).exportPlayerState?.();

    expect(exportState()).toEqual({
      coins: 30,
      progress: 0,
      strongTarget: 2,
      ordinaryDolls: 0,
      premiumDolls: {},
    });

    store.startAttempt();
    expect(exportState).toThrow('cannot save active attempt');
  });
});
