import { describe, expect, it } from 'vitest';
import { presentLoadingProgress } from '../../game/assets/scripts/domain/loading-progress';

describe('presentLoadingProgress', () => {
  it.each([
    { completed: 0, total: 8, lights: 8, expected: { percent: 0, litCount: 0 } },
    { completed: 1, total: 8, lights: 8, expected: { percent: 13, litCount: 1 } },
    { completed: 4, total: 8, lights: 6, expected: { percent: 50, litCount: 3 } },
    { completed: 8, total: 8, lights: 8, expected: { percent: 100, litCount: 8 } },
    { completed: 10, total: 8, lights: 8, expected: { percent: 100, litCount: 8 } },
  ])('presents literal progress for $completed of $total', ({ completed, total, lights, expected }) => {
    expect(presentLoadingProgress(completed, total, lights)).toEqual(expected);
  });

  it.each([
    { completed: 1, total: 0, lights: 8 },
    { completed: 1, total: -3, lights: 8 },
    { completed: Number.NaN, total: 8, lights: 8 },
    { completed: 1, total: Number.POSITIVE_INFINITY, lights: 8 },
  ])('returns zero for invalid input %#', ({ completed, total, lights }) => {
    expect(presentLoadingProgress(completed, total, lights)).toEqual({ percent: 0, litCount: 0 });
  });

  it('treats negative completed and light count values as zero', () => {
    expect(presentLoadingProgress(-2, 8, -4)).toEqual({ percent: 0, litCount: 0 });
  });
});
