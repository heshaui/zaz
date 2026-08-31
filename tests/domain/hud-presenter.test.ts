import { describe, expect, it } from 'vitest';
import { presentPrototypeHud } from '../../game/assets/scripts/domain/hud-presenter';

describe('presentPrototypeHud', () => {
  it('等待状态只展示资产、兑换和投币信息', () => {
    const view = presentPrototypeHud({
      coins: 297,
      ordinaryDolls: 2,
      premiumDolls: {},
      cost: 3,
      exchangeCost: 10,
      attemptState: 'waiting',
    });

    expect(view).toEqual({
      coinText: '游戏币 297',
      dollText: '普通 2 · 精品 0',
      canExchange: false,
      exchangeText: '还差 8 只可兑换',
      coinButtonText: '投币 3',
      showCoinButton: true,
      coinButtonEnabled: true,
      showControls: false,
      controlsEnabled: false,
    });
    expect(view).not.toHaveProperty('chargeText');
    expect(view).not.toHaveProperty('litSegments');
  });

  it('按统一配置判断兑换门槛并汇总精品数量', () => {
    expect(presentPrototypeHud({
      coins: 0,
      ordinaryDolls: 20,
      premiumDolls: { 'premium-rabbit': 2, 'premium-cat': 1 },
      cost: 3,
      exchangeCost: 12,
      attemptState: 'waiting',
    })).toMatchObject({
      dollText: '普通 20 · 精品 3',
      canExchange: true,
      exchangeText: '选择精品娃娃 · 消耗 12',
    });
  });

  it('投币后显示控制区，动作期间保持显示但禁止再次操作', () => {
    const baseState = {
      coins: 27,
      ordinaryDolls: 0,
      premiumDolls: {} as Record<string, number>,
      cost: 3,
      exchangeCost: 10,
    };

    expect(presentPrototypeHud({ ...baseState, attemptState: 'ready' })).toMatchObject({
      showCoinButton: false,
      showControls: true,
      controlsEnabled: true,
    });
    expect(presentPrototypeHud({ ...baseState, attemptState: 'running' })).toMatchObject({
      showCoinButton: false,
      showControls: true,
      controlsEnabled: false,
    });
  });

  it('进行中的一局暂时关闭兑换入口', () => {
    expect(presentPrototypeHud({
      coins: 27,
      ordinaryDolls: 12,
      premiumDolls: {},
      cost: 3,
      exchangeCost: 10,
      attemptState: 'ready',
    })).toMatchObject({
      canExchange: false,
      exchangeText: '本轮结束后可兑换',
    });
  });

  it('余额不足时保留投币入口但禁止点击', () => {
    expect(presentPrototypeHud({
      coins: 2,
      ordinaryDolls: 0,
      premiumDolls: {},
      cost: 3,
      exchangeCost: 10,
      attemptState: 'waiting',
    })).toMatchObject({
      showCoinButton: true,
      coinButtonEnabled: false,
      showControls: false,
    });
  });
});
