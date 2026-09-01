import type { MainUiFlowState } from './main-ui-flow';

export interface GameUiVisibility {
  showHomePanel: boolean;
  showTopHud: boolean;
  showGameConsole: boolean;
}

export function resolveGameUiVisibility(state: MainUiFlowState): GameUiVisibility {
  if (state.layer !== 'none') {
    return {
      showHomePanel: false,
      showTopHud: false,
      showGameConsole: false,
    };
  }
  const showHomePanel = state.phase === 'home';
  return {
    showHomePanel,
    showTopHud: !showHomePanel,
    showGameConsole: !showHomePanel,
  };
}
