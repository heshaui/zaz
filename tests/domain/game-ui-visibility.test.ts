import { describe, expect, it } from 'vitest';
import { resolveGameUiVisibility } from '../../game/assets/scripts/domain/game-ui-visibility';
import { createInitialMainUiFlow, reduceMainUiFlow } from '../../game/assets/scripts/domain/main-ui-flow';

describe('resolveGameUiVisibility', () => {
  it('未投币时只显示首页和投币区域', () => {
    expect(resolveGameUiVisibility(createInitialMainUiFlow())).toEqual({
      showHomePanel: true,
      showTopHud: false,
      showGameConsole: false,
    });
  });

  it('投币后切换到顶部信息和游戏操作台', () => {
    const aiming = reduceMainUiFlow(createInitialMainUiFlow(), { type: 'COIN_ACCEPTED' });

    expect(resolveGameUiVisibility(aiming)).toEqual({
      showHomePanel: false,
      showTopHud: true,
      showGameConsole: true,
    });
  });

  it('结果层和收藏层出现时不显示底层操作区域', () => {
    expect(resolveGameUiVisibility({
      phase: 'home', layer: 'result', outcome: 'won', needsRefill: false,
    })).toEqual({ showHomePanel: false, showTopHud: false, showGameConsole: false });
    expect(resolveGameUiVisibility({
      phase: 'home', layer: 'collection', outcome: null, needsRefill: false,
    })).toEqual({ showHomePanel: false, showTopHud: false, showGameConsole: false });
  });

  it('声音设置覆盖层保留当前页面作为背景', () => {
    expect(resolveGameUiVisibility({
      phase: 'home', layer: 'audio-settings', outcome: null, needsRefill: false,
    })).toEqual({ showHomePanel: true, showTopHud: false, showGameConsole: false });
    expect(resolveGameUiVisibility({
      phase: 'aiming', layer: 'audio-settings', outcome: null, needsRefill: false,
    })).toEqual({ showHomePanel: false, showTopHud: true, showGameConsole: true });
  });
});
