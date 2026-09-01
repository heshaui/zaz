import type { AttemptState } from './prototype-store';
import type { GrabState } from './grab-session';
import type { MainUiLayer, MainUiPhase } from './main-ui-flow';

export interface MachineSwitchGateOptions {
  known: boolean;
  sameMachine: boolean;
  sessionState: GrabState;
  attemptState: AttemptState;
  uiPhase: MainUiPhase;
  uiLayer: MainUiLayer;
  transitioning: boolean;
}

export type MachineSwitchEasing = 'quadIn' | 'quadOut';

export interface MachineSwitchMotion {
  outgoingEndX: number;
  outgoingDuration: number;
  outgoingEasing: MachineSwitchEasing;
  incomingStartX: number;
  incomingDuration: number;
  incomingEasing: MachineSwitchEasing;
}

export function canSelectMachine(options: MachineSwitchGateOptions): boolean {
  return options.known
    && !options.sameMachine
    && options.sessionState === 'idle'
    && options.attemptState === 'waiting'
    && options.uiPhase === 'home'
    && options.uiLayer === 'none'
    && !options.transitioning;
}

export function createMachineSwitchMotion(direction: -1 | 1): MachineSwitchMotion {
  const distance = 0.16;
  return {
    outgoingEndX: -direction * distance,
    outgoingDuration: 0.14,
    outgoingEasing: 'quadIn',
    incomingStartX: direction * distance,
    incomingDuration: 0.22,
    incomingEasing: 'quadOut',
  };
}
