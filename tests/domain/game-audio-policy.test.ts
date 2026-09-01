import { describe, expect, it } from 'vitest';
import {
  createInitialGameAudioState,
  reduceGameAudio,
} from '../../game/assets/scripts/domain/game-audio-policy';

describe('game audio policy', () => {
  it('keeps both channels silent when they start disabled', () => {
    const initial = createInitialGameAudioState({
      backgroundMusicEnabled: false,
      soundEffectsEnabled: false,
    });
    const ready = reduceGameAudio(initial, { type: 'BACKGROUND_READY' });
    const coin = reduceGameAudio(ready.state, { type: 'COIN_ACCEPTED' });

    expect(ready.commands).toEqual([]);
    expect(coin.commands).toEqual([]);
  });

  it('pauses active background music as soon as its setting is disabled', () => {
    const ready = reduceGameAudio(
      createInitialGameAudioState(),
      { type: 'BACKGROUND_READY' },
    );
    const disabled = reduceGameAudio(ready.state, {
      type: 'SET_AUDIO_SETTINGS',
      backgroundMusicEnabled: false,
      soundEffectsEnabled: true,
    });

    expect(disabled.commands).toEqual([
      { type: 'PAUSE_BACKGROUND', cue: 'background' },
    ]);
  });

  it('stops the mechanical loop and suppresses later effects when effects are disabled', () => {
    const moving = reduceGameAudio(
      createInitialGameAudioState(),
      { type: 'MOVEMENT_CHANGED', moving: true },
    );
    const disabled = reduceGameAudio(moving.state, {
      type: 'SET_AUDIO_SETTINGS',
      backgroundMusicEnabled: true,
      soundEffectsEnabled: false,
    });
    const dropped = reduceGameAudio(disabled.state, { type: 'DROP_STARTED' });

    expect(disabled.commands).toEqual([{ type: 'STOP_EFFECTS' }]);
    expect(dropped.commands).toEqual([]);
  });

  it('starts quiet background music when its clip becomes ready', () => {
    const result = reduceGameAudio(
      createInitialGameAudioState(),
      { type: 'BACKGROUND_READY' },
    );

    expect(result.commands).toEqual([
      { type: 'PLAY_BACKGROUND', cue: 'background', volume: 0.07 },
    ]);
    expect(result.state.backgroundPlaying).toBe(true);
  });

  it('pauses background music while hidden and resumes it when shown', () => {
    const ready = reduceGameAudio(
      createInitialGameAudioState(),
      { type: 'BACKGROUND_READY' },
    );
    const hidden = reduceGameAudio(ready.state, { type: 'APP_HIDDEN' });
    const shown = reduceGameAudio(hidden.state, { type: 'APP_SHOWN' });

    expect(hidden.commands).toEqual([
      { type: 'PAUSE_BACKGROUND', cue: 'background' },
    ]);
    expect(shown.commands).toEqual([
      { type: 'PLAY_BACKGROUND', cue: 'background', volume: 0.07 },
    ]);
  });

  it('plays one restrained coin sound only after a paid round is accepted', () => {
    const result = reduceGameAudio(createInitialGameAudioState(), { type: 'COIN_ACCEPTED' });

    expect(result.commands).toEqual([
      { type: 'PLAY_ONE_SHOT', cue: 'coin', volume: 0.5, delaySeconds: 0 },
    ]);
  });

  it('starts and stops the mechanical loop only when manual movement changes', () => {
    const started = reduceGameAudio(
      createInitialGameAudioState(),
      { type: 'MOVEMENT_CHANGED', moving: true },
    );
    const repeated = reduceGameAudio(started.state, { type: 'MOVEMENT_CHANGED', moving: true });
    const stopped = reduceGameAudio(repeated.state, { type: 'MOVEMENT_CHANGED', moving: false });

    expect(started.commands).toEqual([
      { type: 'START_LOOP', cue: 'mechanical', volume: 0.1 },
    ]);
    expect(repeated.commands).toEqual([]);
    expect(stopped.commands).toEqual([
      { type: 'STOP_LOOP', cue: 'mechanical' },
    ]);
  });

  it('keeps the mechanical loop running through the complete grab cycle', () => {
    const moving = reduceGameAudio(
      createInitialGameAudioState(),
      { type: 'MOVEMENT_CHANGED', moving: true },
    );
    const dropped = reduceGameAudio(moving.state, { type: 'DROP_STARTED' });
    const joystickReleased = reduceGameAudio(
      dropped.state,
      { type: 'MOVEMENT_CHANGED', moving: false },
    );

    expect(dropped.commands).toEqual([
      { type: 'PLAY_ONE_SHOT', cue: 'drop-button', volume: 0.32, delaySeconds: 0 },
    ]);
    expect(joystickReleased.commands).toEqual([]);
    expect(joystickReleased.state.mechanicalPlaying).toBe(true);
  });

  it('plays a delayed success cue only after a won round settles', () => {
    const active = reduceGameAudio(
      createInitialGameAudioState(),
      { type: 'DROP_STARTED' },
    );
    const missed = reduceGameAudio(active.state, { type: 'ROUND_SETTLED', won: false });
    const won = reduceGameAudio(active.state, { type: 'ROUND_SETTLED', won: true });

    expect(missed.commands).toEqual([
      { type: 'STOP_LOOP', cue: 'mechanical' },
    ]);
    expect(won.commands).toEqual([
      { type: 'STOP_LOOP', cue: 'mechanical' },
      { type: 'PLAY_ONE_SHOT', cue: 'success', volume: 0.38, delaySeconds: 0.15 },
    ]);
  });
});
