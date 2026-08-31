export interface CycleAdvance {
  isStrong: boolean;
  nextProgress: number;
}

export interface RandomCycleAdvance extends CycleAdvance {
  nextStrongAt: number;
}

export interface RandomCycleOptions {
  progress: number;
  strongAt: number;
  maxAttempts: number;
  nextRandomValue: number;
}

export function selectStrongAttempt(
  maxAttempts: number,
  randomValue: number,
  minAttempt = 1,
): number {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('max attempts must be >= 1');
  }
  if (!Number.isInteger(minAttempt) || minAttempt < 1 || minAttempt > maxAttempts) {
    throw new Error('min attempt must be within range');
  }
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error('random value must be within [0, 1)');
  }

  const availableAttempts = maxAttempts - minAttempt + 1;
  return minAttempt + Math.floor(randomValue * availableAttempts);
}

export function advanceRandomCycle(options: RandomCycleOptions): RandomCycleAdvance {
  const { progress, strongAt, maxAttempts, nextRandomValue } = options;
  if (!Number.isInteger(progress) || progress < 0) {
    throw new Error('progress must be >= 0');
  }
  if (!Number.isInteger(strongAt) || strongAt < 1) {
    throw new Error('strong attempt must be >= 1');
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('max attempts must be >= 1');
  }

  // 后台调低上限时，旧目标可能超出新范围；达到新上限的下一局直接结算当前周期。
  const effectiveStrongAt = Math.min(strongAt, maxAttempts);
  const isStrong = progress + 1 >= effectiveStrongAt;
  if (!isStrong) {
    return {
      isStrong: false,
      nextProgress: progress + 1,
      nextStrongAt: strongAt,
    };
  }

  return {
    isStrong: true,
    nextProgress: 0,
    nextStrongAt: selectStrongAttempt(maxAttempts, nextRandomValue),
  };
}
