import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAMPLE_RATE,
  encodeMonoPcm16Wav,
  generateClawMachineSounds,
} from '../../tools/audio-synthesis';

function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let total = 0;
  for (const sample of samples) total += sample * sample;
  return Math.sqrt(total / samples.length);
}

function windowedRms(samples: Float32Array, windowSize: number): number[] {
  const values: number[] = [];
  for (let offset = 0; offset + windowSize <= samples.length; offset += windowSize) {
    values.push(rms(samples.subarray(offset, offset + windowSize)));
  }
  return values;
}

describe('claw machine audio synthesis', () => {
  it('creates four audible mono sounds with practical game durations', () => {
    const sounds = generateClawMachineSounds(DEFAULT_SAMPLE_RATE);
    const durations = Object.fromEntries(
      Object.entries(sounds).map(([name, samples]) => [
        name,
        samples.length / DEFAULT_SAMPLE_RATE,
      ]),
    );

    expect(Object.keys(sounds)).toEqual(['coin', 'button', 'rail', 'prize']);
    expect(durations.coin).toBeGreaterThanOrEqual(0.4);
    expect(durations.coin).toBeLessThanOrEqual(0.8);
    expect(durations.button).toBeGreaterThanOrEqual(0.1);
    expect(durations.button).toBeLessThanOrEqual(0.3);
    expect(durations.rail).toBeGreaterThanOrEqual(2);
    expect(durations.rail).toBeLessThanOrEqual(4);
    expect(durations.prize).toBeGreaterThanOrEqual(0.5);
    expect(durations.prize).toBeLessThanOrEqual(1);

    const allSounds = [sounds.coin, sounds.button, sounds.rail, sounds.prize];
    for (const samples of allSounds) {
      const peak = Math.max(...samples.map((sample) => Math.abs(sample)));
      expect(peak).toBeGreaterThan(0.08);
      expect(peak).toBeLessThanOrEqual(0.95);
    }
  });

  it('keeps the rail loop steady and joins its end without an audible step', () => {
    const { rail } = generateClawMachineSounds(DEFAULT_SAMPLE_RATE);
    const levels = windowedRms(rail, Math.round(DEFAULT_SAMPLE_RATE * 0.1));
    const average = levels.reduce((total, level) => total + level, 0) / levels.length;
    const spread = Math.max(...levels) - Math.min(...levels);

    expect(average).toBeGreaterThan(0.025);
    expect(average).toBeLessThan(0.2);
    expect(spread / average).toBeLessThan(0.22);
    expect(Math.abs(rail[0] - rail[rail.length - 1])).toBeLessThan(0.03);
  });

  it('lets one-shot sounds settle to silence instead of ending abruptly', () => {
    const sounds = generateClawMachineSounds(DEFAULT_SAMPLE_RATE);
    const tailSize = Math.round(DEFAULT_SAMPLE_RATE * 0.05);

    expect(rms(sounds.coin.subarray(-tailSize))).toBeLessThan(0.008);
    expect(rms(sounds.button.subarray(-tailSize))).toBeLessThan(0.008);
    expect(rms(sounds.prize.subarray(-tailSize))).toBeLessThan(0.008);
  });

  it('encodes standard 16-bit mono wav data that contains every sample', () => {
    const wav = encodeMonoPcm16Wav(new Float32Array([-1, 0, 1]), 8_000);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    const text = (offset: number, length: number) =>
      String.fromCharCode(...wav.subarray(offset, offset + length));

    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(8_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(text(36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(6);
    expect(wav.byteLength).toBe(50);
  });
});
