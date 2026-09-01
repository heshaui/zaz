import { describe, expect, it } from 'vitest';
import {
  createInitialGameAudioState,
  reduceGameAudio,
} from '../../game/assets/scripts/domain/game-audio-policy';

describe('game audio policy', () => {
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
