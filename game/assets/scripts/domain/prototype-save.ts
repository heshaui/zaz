import {
  HOME_MACHINES,
  type HomeMachineDefinition,
} from './home-machine-selection';
import { selectStrongAttempt } from './grab-rules';

export interface MachineRuntimeState {
  progress: number;
  strongTarget: number;
  layoutSequence: number;
  remainingDolls: number;
}

export interface PrototypePlayerState {
  coins: number;
  ordinaryDolls: number;
  premiumDolls: Record<string, number>;
  selectedMachineId: string;
  machines: Record<string, MachineRuntimeState>;
}

export interface PrototypeSaveOptions {
  machines: readonly HomeMachineDefinition[];
  strongMaxAttempts: number;
  random?: () => number;
}

export interface PrototypeStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const PLAYER_SAVE_VERSION = 3;
const PLAYER_SAVE_KEY = 'virtual-claw-game.player.v1';
const DEFAULT_SAVE_OPTIONS: PrototypeSaveOptions = {
  machines: HOME_MACHINES,
  strongMaxAttempts: 5,
};

export function parsePrototypePlayerState(
  raw: string | null,
  options: PrototypeSaveOptions = DEFAULT_SAVE_OPTIONS,
): PrototypePlayerState | null {
  if (raw === null || !areOptionsValid(options)) return null;
  try {
    const envelope = JSON.parse(raw) as unknown;
    if (!isRecord(envelope)) return null;
    if (envelope.version === 1) return migrateLegacyState(envelope.state, false, options);
    if (envelope.version === 2) return migrateLegacyState(envelope.state, true, options);
    if (envelope.version === PLAYER_SAVE_VERSION) {
      return normalizeCurrentState(envelope.state, options);
    }
    return null;
  } catch {
    return null;
  }
}

export function loadPrototypePlayerState(
  storage: PrototypeStoragePort,
  options: PrototypeSaveOptions = DEFAULT_SAVE_OPTIONS,
): PrototypePlayerState | null {
  try {
    return parsePrototypePlayerState(storage.getItem(PLAYER_SAVE_KEY), options);
  } catch {
    return null;
  }
}

export function savePrototypePlayerState(
  storage: PrototypeStoragePort,
  state: PrototypePlayerState,
  options: PrototypeSaveOptions = DEFAULT_SAVE_OPTIONS,
): boolean {
  try {
    const normalizedState = normalizeCurrentState(state, options);
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

function normalizeCurrentState(
  value: unknown,
  options: PrototypeSaveOptions,
): PrototypePlayerState | null {
  if (!areOptionsValid(options) || !isRecord(value) || !isRecord(value.machines)) return null;
  const shared = normalizeSharedState(value);
  if (!shared) return null;

  const machines: Record<string, MachineRuntimeState> = {};
  for (const id of Object.keys(value.machines)) {
    const definition = options.machines.find((machine) => machine.id === id);
    const normalized = normalizeMachineState(value.machines[id], definition?.batchSize);
    if (normalized) machines[id] = normalized;
  }

  // 已上架机台必须都有可用状态；单项缺失或损坏时只补该台，避免清空共享资产。
  options.machines.forEach((machine) => {
    if (!machines[machine.id]) machines[machine.id] = createDefaultMachineState(machine, options);
  });

  const selectedMachineId = typeof value.selectedMachineId === 'string'
    && options.machines.some((machine) => machine.id === value.selectedMachineId)
    ? value.selectedMachineId
    : options.machines[0].id;
  return {
    ...shared,
    selectedMachineId,
    machines,
  };
}

function migrateLegacyState(
  value: unknown,
  requireStrongTarget: boolean,
  options: PrototypeSaveOptions,
): PrototypePlayerState | null {
  if (!areOptionsValid(options) || !isRecord(value)) return null;
  const shared = normalizeSharedState(value);
  if (!shared || !isNonNegativeInteger(value.progress)) return null;
  if (requireStrongTarget && !isPositiveInteger(value.strongTarget)) return null;

  const machines: Record<string, MachineRuntimeState> = {};
  options.machines.forEach((machine, index) => {
    if (index === 0) {
      machines[machine.id] = createDefaultMachineState(
        machine,
        options,
        value.progress as number,
        requireStrongTarget ? value.strongTarget as number : undefined,
      );
      return;
    }
    machines[machine.id] = createDefaultMachineState(machine, options);
  });

  return {
    ...shared,
    selectedMachineId: options.machines[0].id,
    machines,
  };
}

function normalizeSharedState(value: Record<string, unknown>): Pick<
  PrototypePlayerState,
  'coins' | 'ordinaryDolls' | 'premiumDolls'
> | null {
  if (
    !isNonNegativeInteger(value.coins)
    || !isNonNegativeInteger(value.ordinaryDolls)
    || !isRecord(value.premiumDolls)
  ) return null;

  const premiumDolls: Record<string, number> = {};
  for (const id of Object.keys(value.premiumDolls)) {
    const count = value.premiumDolls[id];
    if (id.trim().length === 0 || !isPositiveInteger(count)) return null;
    premiumDolls[id] = count as number;
  }
  return {
    coins: value.coins as number,
    ordinaryDolls: value.ordinaryDolls as number,
    premiumDolls,
  };
}

function normalizeMachineState(
  value: unknown,
  batchSize?: number,
): MachineRuntimeState | null {
  if (!isRecord(value)) return null;
  if (
    !isNonNegativeInteger(value.progress)
    || !isPositiveInteger(value.strongTarget)
    || !isNonNegativeInteger(value.layoutSequence)
    || !isNonNegativeInteger(value.remainingDolls)
  ) return null;
  if (batchSize !== undefined && (value.remainingDolls as number) > batchSize) return null;
  return {
    progress: value.progress as number,
    strongTarget: value.strongTarget as number,
    layoutSequence: value.layoutSequence as number,
    remainingDolls: value.remainingDolls as number,
  };
}

function createDefaultMachineState(
  machine: HomeMachineDefinition,
  options: PrototypeSaveOptions,
  progress = 0,
  strongTarget?: number,
): MachineRuntimeState {
  const firstAvailableAttempt = Math.min(progress + 1, options.strongMaxAttempts);
  return {
    progress,
    strongTarget: strongTarget ?? selectStrongAttempt(
      options.strongMaxAttempts,
      (options.random ?? Math.random)(),
      firstAvailableAttempt,
    ),
    layoutSequence: 0,
    remainingDolls: machine.batchSize,
  };
}

function areOptionsValid(options: PrototypeSaveOptions): boolean {
  return options.machines.length > 0
    && Number.isInteger(options.strongMaxAttempts)
    && options.strongMaxAttempts >= 1;
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
