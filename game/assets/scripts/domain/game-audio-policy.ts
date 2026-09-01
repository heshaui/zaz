import {
  DEFAULT_AUDIO_SETTINGS,
  type AudioSettings,
} from './audio-settings';

export type GameAudioCue =
  | 'coin'
  | 'drop-button'
  | 'mechanical'
  | 'success'
  | 'background';

export type GameOneShotCue = Exclude<GameAudioCue, 'mechanical' | 'background'>;

export type GameAudioAction =
  | { type: 'COIN_ACCEPTED' }
  | { type: 'DROP_STARTED' }
  | { type: 'MOVEMENT_CHANGED'; moving: boolean }
  | { type: 'ROUND_SETTLED'; won: boolean }
  | { type: 'BACKGROUND_READY' }
  | { type: 'APP_HIDDEN' }
  | { type: 'APP_SHOWN' }
  | ({ type: 'SET_AUDIO_SETTINGS' } & AudioSettings);

export type GameAudioCommand =
  | {
    type: 'PLAY_ONE_SHOT';
    cue: GameOneShotCue;
    volume: number;
    delaySeconds: number;
  }
  | { type: 'START_LOOP'; cue: 'mechanical'; volume: number }
  | { type: 'STOP_LOOP'; cue: 'mechanical' }
  | { type: 'PLAY_BACKGROUND'; cue: 'background'; volume: number }
  | { type: 'PAUSE_BACKGROUND'; cue: 'background' }
  | { type: 'STOP_EFFECTS' };

export interface GameAudioState {
  manualMoving: boolean;
  grabCycleActive: boolean;
  mechanicalPlaying: boolean;
  backgroundReady: boolean;
  backgroundPlaying: boolean;
  appActive: boolean;
  backgroundMusicEnabled: boolean;
  soundEffectsEnabled: boolean;
}

export interface GameAudioTransition {
  state: GameAudioState;
  commands: GameAudioCommand[];
}

export function createInitialGameAudioState(
  settings: AudioSettings = DEFAULT_AUDIO_SETTINGS,
): GameAudioState {
  return {
    manualMoving: false,
    grabCycleActive: false,
    mechanicalPlaying: false,
    backgroundReady: false,
    backgroundPlaying: false,
    appActive: true,
    backgroundMusicEnabled: settings.backgroundMusicEnabled,
    soundEffectsEnabled: settings.soundEffectsEnabled,
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
      if (next.soundEffectsEnabled) {
        commands.push({
          type: 'PLAY_ONE_SHOT',
          cue: 'coin',
          volume: 0.5,
          delaySeconds: 0,
        });
      }
      break;
    case 'DROP_STARTED':
      next.grabCycleActive = true;
      if (next.soundEffectsEnabled) {
        commands.push({
          type: 'PLAY_ONE_SHOT',
          cue: 'drop-button',
          volume: 0.32,
          delaySeconds: 0,
        });
      }
      break;
    case 'MOVEMENT_CHANGED':
      next.manualMoving = action.moving;
      break;
    case 'ROUND_SETTLED':
      next.grabCycleActive = false;
      next.manualMoving = false;
      if (action.won && next.soundEffectsEnabled) {
        commands.push({
          type: 'PLAY_ONE_SHOT',
          cue: 'success',
          volume: 0.38,
          delaySeconds: 0.15,
        });
      }
      break;
    case 'BACKGROUND_READY':
      next.backgroundReady = true;
      if (next.appActive && next.backgroundMusicEnabled && !next.backgroundPlaying) {
        next.backgroundPlaying = true;
        commands.push({
          type: 'PLAY_BACKGROUND',
          cue: 'background',
          volume: 0.07,
        });
      }
      break;
    case 'APP_HIDDEN':
      next.appActive = false;
      if (next.backgroundPlaying) {
        next.backgroundPlaying = false;
        commands.push({ type: 'PAUSE_BACKGROUND', cue: 'background' });
      }
      break;
    case 'APP_SHOWN':
      next.appActive = true;
      if (
        next.backgroundReady
        && next.backgroundMusicEnabled
        && !next.backgroundPlaying
      ) {
        next.backgroundPlaying = true;
        commands.push({
          type: 'PLAY_BACKGROUND',
          cue: 'background',
          volume: 0.07,
        });
      }
      break;
    case 'SET_AUDIO_SETTINGS': {
      const effectsWereEnabled = next.soundEffectsEnabled;
      next.backgroundMusicEnabled = action.backgroundMusicEnabled;
      next.soundEffectsEnabled = action.soundEffectsEnabled;

      if (!next.backgroundMusicEnabled && next.backgroundPlaying) {
        next.backgroundPlaying = false;
        commands.push({ type: 'PAUSE_BACKGROUND', cue: 'background' });
      } else if (
        next.backgroundMusicEnabled
        && next.backgroundReady
        && next.appActive
        && !next.backgroundPlaying
      ) {
        next.backgroundPlaying = true;
        commands.push({
          type: 'PLAY_BACKGROUND',
          cue: 'background',
          volume: 0.07,
        });
      }

      if (effectsWereEnabled && !next.soundEffectsEnabled) {
        next.mechanicalPlaying = false;
        commands.push({ type: 'STOP_EFFECTS' });
      }
      break;
    }
  }

  const shouldPlayMechanical = next.soundEffectsEnabled
    && (next.manualMoving || next.grabCycleActive);
  const effectsStoppedImmediately = commands.some((command) => command.type === 'STOP_EFFECTS');
  if (effectsStoppedImmediately) {
    next.mechanicalPlaying = false;
  } else if (shouldPlayMechanical !== state.mechanicalPlaying) {
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
