import type { AttemptState } from './prototype-store';

export interface PrototypeHudState {
  coins: number;
  ordinaryDolls: number;
  premiumDolls: Readonly<Record<string, number>>;
  cost: number;
  exchangeCost: number;
  attemptState: AttemptState;
}

export interface PrototypeHudView {
  coinText: string;
  dollText: string;
  ordinaryText: string;
  premiumText: string;
  feeText: string;
  instructionText: string;
  canExchange: boolean;
  exchangeText: string;
  coinButtonText: string;
  showCoinButton: boolean;
  coinButtonEnabled: boolean;
  showControls: boolean;
  controlsEnabled: boolean;
}

export function presentPrototypeHud(state: PrototypeHudState): PrototypeHudView {
  const waiting = state.attemptState === 'waiting';
  const ready = state.attemptState === 'ready';
  const premiumTotal = Object.keys(state.premiumDolls)
    .reduce((total, id) => total + state.premiumDolls[id], 0);
  const hasEnoughDolls = state.ordinaryDolls >= state.exchangeCost;
  const canExchange = waiting && hasEnoughDolls;
  return {
    coinText: `游戏币 ${state.coins}`,
    dollText: `普通 ${state.ordinaryDolls} · 精品 ${premiumTotal}`,
    ordinaryText: `普通娃娃 ${state.ordinaryDolls}`,
    premiumText: `精品 ${premiumTotal}`,
    feeText: `${state.cost} 币 / 局`,
    instructionText: waiting
      ? '请先投币'
      : ready
        ? '移动摇杆，选择落点'
        : '正在完成本局动作',
    canExchange,
    exchangeText: !waiting && hasEnoughDolls
      ? '本轮结束后可兑换'
      : hasEnoughDolls
        ? `选择精品娃娃 · 消耗 ${state.exchangeCost}`
        : `还差 ${state.exchangeCost - state.ordinaryDolls} 只可兑换`,
    coinButtonText: `投入 ${state.cost} 币`,
    showCoinButton: waiting,
    coinButtonEnabled: waiting && state.coins >= state.cost,
    showControls: !waiting,
    controlsEnabled: ready,
  };
}
