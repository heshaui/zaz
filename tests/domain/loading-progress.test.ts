import { describe, expect, it } from 'vitest';
import {
  calculateLoadingBarGeometry,
  calculateRemainingDisplayTime,
  presentLoadingProgress,
} from '../../game/assets/scripts/domain/loading-progress';

describe('calculateLoadingBarGeometry', () => {
  it.each([
    { ratio: 0, expected: { fillWidth: 0, markerX: -226 } },
    { ratio: 0.5, expected: { fillWidth: 240, markerX: 0 } },
    { ratio: 1, expected: { fillWidth: 480, markerX: 226 } },
  ])('keeps the star marker inside a 480px track at ratio $ratio', ({ ratio, expected }) => {
    expect(calculateLoadingBarGeometry(ratio, 480, 14)).toEqual(expected);
  });

  it('clamps invalid progress and dimensions to safe values', () => {
    expect(calculateLoadingBarGeometry(Number.NaN, -20, -4)).toEqual({
      fillWidth: 0,
      markerX: 0,
    });
  });
});

describe('presentLoadingProgress', () => {
  it.each([
    { completed: 0, total: 8, lights: 8, expected: { ratio: 0, percent: 0, litCount: 0 } },
    { completed: 1, total: 8, lights: 8, expected: { ratio: 0.125, percent: 13, litCount: 1 } },
    { completed: 4, total: 8, lights: 6, expected: { ratio: 0.5, percent: 50, litCount: 3 } },
    { completed: 8, total: 8, lights: 8, expected: { ratio: 1, percent: 100, litCount: 8 } },
    { completed: 10, total: 8, lights: 8, expected: { ratio: 1, percent: 100, litCount: 8 } },
  ])('presents literal progress for $completed of $total', ({ completed, total, lights, expected }) => {
    expect(presentLoadingProgress(completed, total, lights)).toEqual(expected);
  });

  it.each([
    { completed: 1, total: 0, lights: 8 },
    { completed: 1, total: -3, lights: 8 },
    { completed: Number.NaN, total: 8, lights: 8 },
    { completed: 1, total: Number.POSITIVE_INFINITY, lights: 8 },
  ])('returns zero for invalid input %#', ({ completed, total, lights }) => {
    expect(presentLoadingProgress(completed, total, lights)).toEqual({ ratio: 0, percent: 0, litCount: 0 });
  });

  it('treats negative completed and light count values as zero', () => {
    expect(presentLoadingProgress(-2, 8, -4)).toEqual({ ratio: 0, percent: 0, litCount: 0 });
  });
});

describe('calculateRemainingDisplayTime', () => {
  it.each([
    { elapsed: 0, minimum: 1200, expected: 1200 },
    { elapsed: 450, minimum: 1200, expected: 750 },
    { elapsed: 1200, minimum: 1200, expected: 0 },
    { elapsed: 1800, minimum: 1200, expected: 0 },
  ])('returns $expected ms when elapsed is $elapsed ms', ({ elapsed, minimum, expected }) => {
    expect(calculateRemainingDisplayTime(elapsed, minimum)).toBe(expected);
  });
});
