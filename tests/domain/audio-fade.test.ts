import { describe, expect, it } from 'vitest';
import { moveAudioGainTowards } from '../../game/assets/scripts/domain/audio-fade';

describe('audio gain fade', () => {
  it('moves toward the target by the elapsed fade distance', () => {
    expect(moveAudioGainTowards(0, 0.16, 0.05, 1.6)).toBeCloseTo(0.08);
    expect(moveAudioGainTowards(0.16, 0, 0.05, 1.6)).toBeCloseTo(0.08);
  });

  it('stops exactly at the target without overshooting', () => {
    expect(moveAudioGainTowards(0.15, 0.16, 0.1, 1.6)).toBe(0.16);
    expect(moveAudioGainTowards(0.01, 0, 0.1, 1.6)).toBe(0);
  });
});
