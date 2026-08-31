export interface PrototypePlayerState {
  coins: number;
  progress: number;
  strongTarget?: number;
  ordinaryDolls: number;
  premiumDolls: Record<string, number>;
}

export interface PrototypeStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const PLAYER_SAVE_VERSION = 2;
const PLAYER_SAVE_KEY = 'virtual-claw-game.player.v1';

export function parsePrototypePlayerState(raw: string | null): PrototypePlayerState | null {
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as unknown;
    if (!isRecord(envelope)) return null;
    if (envelope.version === 1) return normalizePlayerState(envelope.state, false);
    if (envelope.version === PLAYER_SAVE_VERSION) {
      return normalizePlayerState(envelope.state, true);
    }
    return null;
  } catch {
    return null;
  }
}

export function loadPrototypePlayerState(
  storage: PrototypeStoragePort,
): PrototypePlayerState | null {
  try {
    return parsePrototypePlayerState(storage.getItem(PLAYER_SAVE_KEY));
  } catch {
    return null;
  }
}

export function savePrototypePlayerState(
  storage: PrototypeStoragePort,
  state: PrototypePlayerState,
): boolean {
  try {
    const normalizedState = normalizePlayerState(state, true);
    if (!normalizedState) return false;
    storage.setItem(PLAYER_SAVE_KEY, JSON.stringify({
      version: PLAYER_SAVE_VERSION,
      state: normalizedState,
    }));
    return true;
  } catch {
    return false;
  }
}

function normalizePlayerState(
  value: unknown,
  requireStrongTarget: boolean,
): PrototypePlayerState | null {
  if (!isRecord(value) || !isRecord(value.premiumDolls)) return null;
  const numericValues = [value.coins, value.progress, value.ordinaryDolls];
  if (!numericValues.every(isNonNegativeInteger)) return null;
  if (requireStrongTarget && !isPositiveInteger(value.strongTarget)) return null;

  const premiumDolls: Record<string, number> = {};
  for (const id of Object.keys(value.premiumDolls)) {
    const count = value.premiumDolls[id];
    if (id.trim().length === 0 || !Number.isInteger(count) || (count as number) < 1) return null;
    premiumDolls[id] = count as number;
  }

  // 旧格式没有隐藏目标，状态层会结合当前配置从尚未经过的次数中补齐。
  const playerState: PrototypePlayerState = {
    coins: value.coins as number,
    progress: value.progress as number,
    ordinaryDolls: value.ordinaryDolls as number,
    premiumDolls,
  };
  if (requireStrongTarget) playerState.strongTarget = value.strongTarget as number;
  return playerState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isPositiveInteger(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 1;
}
