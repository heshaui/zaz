export type GameAudioCue = 'coin' | 'drop-button' | 'mechanical' | 'success';

export type GameAudioAction =
  | { type: 'COIN_ACCEPTED' }
  | { type: 'DROP_STARTED' }
  | { type: 'MOVEMENT_CHANGED'; moving: boolean }
  | { type: 'ROUND_SETTLED'; won: boolean };

export type GameAudioCommand =
  | {
    type: 'PLAY_ONE_SHOT';
    cue: Exclude<GameAudioCue, 'mechanical'>;
    volume: number;
    delaySeconds: number;
  }
  | { type: 'START_LOOP'; cue: 'mechanical'; volume: number }
  | { type: 'STOP_LOOP'; cue: 'mechanical' };

export interface GameAudioState {
  manualMoving: boolean;
  grabCycleActive: boolean;
  mechanicalPlaying: boolean;
}

export interface GameAudioTransition {
  state: GameAudioState;
  commands: GameAudioCommand[];
}

export function createInitialGameAudioState(): GameAudioState {
  return {
    manualMoving: false,
    grabCycleActive: false,
    mechanicalPlaying: false,
  };
}

export function reduceGameAudio(
  state: GameAudioState,
  action: GameAudioAction,
): GameAudioTransition {
  const next = { ...state };
  const commands: GameAudioCommand[] = [];

  switch (action.type) {
    case 'COIN_ACCEPTED':
      commands.push({
        type: 'PLAY_ONE_SHOT',
        cue: 'coin',
        volume: 0.5,
        delaySeconds: 0,
      });
      break;
    case 'DROP_STARTED':
      next.grabCycleActive = true;
      commands.push({
        type: 'PLAY_ONE_SHOT',
        cue: 'drop-button',
        volume: 0.32,
        delaySeconds: 0,
      });
      break;
    case 'MOVEMENT_CHANGED':
      next.manualMoving = action.moving;
      break;
    case 'ROUND_SETTLED':
      next.grabCycleActive = false;
      next.manualMoving = false;
      if (action.won) {
        commands.push({
          type: 'PLAY_ONE_SHOT',
          cue: 'success',
          volume: 0.38,
          delaySeconds: 0.15,
        });
      }
      break;
  }

  const shouldPlayMechanical = next.manualMoving || next.grabCycleActive;
  if (shouldPlayMechanical !== state.mechanicalPlaying) {
    // 手动位移和整轮动作共享同一条机械循环，任一流程仍在运行时都不能提前停声。
    if (shouldPlayMechanical) {
      commands.splice(action.type === 'DROP_STARTED' ? 1 : 0, 0, {
        type: 'START_LOOP',
        cue: 'mechanical',
        volume: 0.1,
      });
    } else {
      commands.unshift({ type: 'STOP_LOOP', cue: 'mechanical' });
    }
    next.mechanicalPlaying = shouldPlayMechanical;
  }

  return { state: next, commands };
}
