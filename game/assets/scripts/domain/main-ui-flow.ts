export type MainUiPhase = 'home' | 'aiming' | 'running';
export type MainUiLayer =
  | 'none'
  | 'collection'
  | 'result'
  | 'exit-confirm'
  | 'refilling'
  | 'audio-settings';
export type RoundOutcome = 'won' | 'missed';

export interface MainUiFlowState {
  phase: MainUiPhase;
  layer: MainUiLayer;
  outcome: RoundOutcome | null;
  needsRefill: boolean;
}

export type GameConsoleAction = 'drop' | 'camera' | 'exit';

export function canUseGameConsoleAction(
  state: MainUiFlowState,
  _action: GameConsoleAction,
): boolean {
  return state.phase === 'aiming' && state.layer === 'none';
}

export type MainUiAction =
  | { type: 'COIN_ACCEPTED' }
  | { type: 'DROP_STARTED' }
  | { type: 'ROUND_SETTLED'; outcome: RoundOutcome; needsRefill: boolean }
  | { type: 'OPEN_COLLECTION' }
  | { type: 'CLOSE_COLLECTION' }
  | { type: 'OPEN_AUDIO_SETTINGS' }
  | { type: 'CLOSE_AUDIO_SETTINGS' }
  | { type: 'REQUEST_EXIT' }
  | { type: 'CANCEL_EXIT' }
  | { type: 'CONFIRM_EXIT' }
  | { type: 'CLOSE_RESULT' }
  | { type: 'REFILL_FINISHED' };

export function createInitialMainUiFlow(): MainUiFlowState {
  return { phase: 'home', layer: 'none', outcome: null, needsRefill: false };
}

export function reduceMainUiFlow(
  state: MainUiFlowState,
  action: MainUiAction,
): MainUiFlowState {
  // 每次状态转换同时约束主流程和覆盖层，非法事件必须保留原对象，供界面跳过无效刷新。
  switch (action.type) {
    case 'COIN_ACCEPTED':
      return state.phase === 'home' && state.layer === 'none'
        ? { ...state, phase: 'aiming' }
        : state;
    case 'DROP_STARTED':
      return state.phase === 'aiming' && state.layer === 'none'
        ? { ...state, phase: 'running' }
        : state;
    case 'ROUND_SETTLED':
      if (state.phase !== 'running' || state.layer !== 'none') return state;
      // 未获得的结果已由机台动作完整呈现，直接恢复首页可省去一次关闭操作。
      if (action.outcome === 'missed') return createInitialMainUiFlow();
      return {
        phase: 'home',
        layer: 'result',
        outcome: action.outcome,
        needsRefill: action.needsRefill,
      };
    case 'OPEN_COLLECTION':
      return state.phase === 'home' && state.layer === 'none'
        ? { ...state, layer: 'collection' }
        : state;
    case 'CLOSE_COLLECTION':
      return state.phase === 'home' && state.layer === 'collection'
        ? { ...state, layer: 'none' }
        : state;
    case 'OPEN_AUDIO_SETTINGS':
      return (state.phase === 'home' || state.phase === 'aiming') && state.layer === 'none'
        ? { ...state, layer: 'audio-settings' }
        : state;
    case 'CLOSE_AUDIO_SETTINGS':
      return state.layer === 'audio-settings'
        ? { ...state, layer: 'none' }
        : state;
    case 'REQUEST_EXIT':
      return state.phase === 'aiming' && state.layer === 'none'
        ? { ...state, layer: 'exit-confirm' }
        : state;
    case 'CANCEL_EXIT':
      return state.phase === 'aiming' && state.layer === 'exit-confirm'
        ? { ...state, layer: 'none' }
        : state;
    case 'CONFIRM_EXIT':
      return state.phase === 'aiming' && state.layer === 'exit-confirm'
        ? createInitialMainUiFlow()
        : state;
    case 'CLOSE_RESULT':
      if (state.phase !== 'home' || state.layer !== 'result') return state;
      return state.needsRefill
        ? { ...state, layer: 'refilling' }
        : createInitialMainUiFlow();
    case 'REFILL_FINISHED':
      return state.phase === 'home' && state.layer === 'refilling'
        ? createInitialMainUiFlow()
        : state;
  }
}
