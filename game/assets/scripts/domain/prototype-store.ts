import {
  advanceRandomCycle,
  selectStrongAttempt,
} from './grab-rules';
import {
  HOME_MACHINES,
  type HomeMachineDefinition,
} from './home-machine-selection';
import type {
  MachineRuntimeState,
  PrototypePlayerState,
} from './prototype-save';

interface LegacyPrototypePlayerState {
  coins: number;
  progress: number;
  strongTarget?: number;
  ordinaryDolls: number;
  premiumDolls: Record<string, number>;
}

export interface PrototypeStoreOptions {
  coins: number;
  cost: number;
  strongMaxAttempts: number;
  exchangeCost?: number;
  machines?: readonly HomeMachineDefinition[];
  playerState?: PrototypePlayerState | LegacyPrototypePlayerState;
  random?: () => number;
}

export type AttemptState = 'waiting' | 'ready' | 'running';

export interface PrototypeSnapshot {
  coins: number;
  cost: number;
  ordinaryDolls: number;
  premiumDolls: Readonly<Record<string, number>>;
  exchangeCost: number;
  attemptState: AttemptState;
  machineId: string;
  remainingDolls: number;
  layoutSequence: number;
  needsRefill: boolean;
}

export class PrototypeStore {
  private coins: number;
  private ordinaryDolls = 0;
  private readonly premiumDolls = new Map<string, number>();
  private readonly exchangeCost: number;
  private attemptOpen = false;
  private dropExecuted = false;
  private currentStrong = false;
  private readonly random: () => number;
  private readonly machineDefinitions: readonly HomeMachineDefinition[];
  private readonly machineStates = new Map<string, MachineRuntimeState>();
  private activeMachineId: string;

  constructor(private readonly options: PrototypeStoreOptions) {
    if (!Number.isInteger(options.strongMaxAttempts) || options.strongMaxAttempts < 1) {
      throw new Error('max attempts must be >= 1');
    }
    this.machineDefinitions = options.machines ?? HOME_MACHINES;
    if (this.machineDefinitions.length === 0) {
      throw new Error('machine catalog must not be empty');
    }
    if (new Set(this.machineDefinitions.map((machine) => machine.id)).size !== this.machineDefinitions.length) {
      throw new Error('machine ids must be unique');
    }

    const playerState = options.playerState;
    this.random = options.random ?? Math.random;
    this.coins = playerState?.coins ?? options.coins;
    this.ordinaryDolls = playerState?.ordinaryDolls ?? 0;
    Object.keys(playerState?.premiumDolls ?? {}).forEach((id) => {
      this.premiumDolls.set(id, playerState!.premiumDolls[id]);
    });
    this.exchangeCost = options.exchangeCost ?? 10;
    if (!Number.isInteger(this.exchangeCost) || this.exchangeCost < 1) {
      throw new Error('exchange cost must be >= 1');
    }

    if (playerState && 'machines' in playerState) {
      Object.keys(playerState.machines).forEach((id) => {
        this.machineStates.set(id, { ...playerState.machines[id] });
      });
      this.activeMachineId = this.hasMachine(playerState.selectedMachineId)
        ? playerState.selectedMachineId
        : this.machineDefinitions[0].id;
    } else {
      this.activeMachineId = this.machineDefinitions[0].id;
      const legacyState = playerState as LegacyPrototypePlayerState | undefined;
      if (legacyState) {
        this.machineStates.set(this.activeMachineId, {
          progress: legacyState.progress,
          strongTarget: legacyState.strongTarget ?? 0,
          layoutSequence: 0,
          remainingDolls: this.machineDefinitions[0].batchSize,
        });
      }
    }

    this.prepareMissingMachineStates();
  }

  startAttempt(): { coins: number } {
    if (this.attemptOpen) throw new Error('attempt already open');
    if (this.coins < this.options.cost) throw new Error('insufficient coins');

    this.coins -= this.options.cost;
    this.attemptOpen = true;
    this.dropExecuted = false;
    this.currentStrong = false;
    return { coins: this.coins };
  }

  abandonAttempt(): void {
    if (!this.attemptOpen || this.dropExecuted) throw new Error('abandon is not allowed');

    // 放弃只关闭已经付费但尚未下爪的回合，币数和当前机台隐藏周期均保持现状。
    this.attemptOpen = false;
    this.dropExecuted = false;
    this.currentStrong = false;
  }

  executeDrop(): { isStrong: boolean } {
    if (!this.attemptOpen || this.dropExecuted) throw new Error('drop is not allowed');

    const machine = this.getActiveMachineState();
    const reachesTarget = machine.progress + 1 >= Math.min(
      machine.strongTarget,
      this.options.strongMaxAttempts,
    );
    const result = advanceRandomCycle({
      progress: machine.progress,
      strongAt: machine.strongTarget,
      maxAttempts: this.options.strongMaxAttempts,
      nextRandomValue: reachesTarget ? this.random() : 0,
    });
    machine.progress = result.nextProgress;
    machine.strongTarget = result.nextStrongAt;
    this.currentStrong = result.isStrong;
    this.dropExecuted = true;
    return { isStrong: this.currentStrong };
  }

  settleAttempt(won: boolean): void {
    if (!this.attemptOpen || !this.dropExecuted) {
      throw new Error('attempt is not ready to settle');
    }

    // 是否进入出口由动作层给出；状态层只修改当前机台批次，不触碰其他机台库存。
    if (won) {
      this.ordinaryDolls += 1;
      const machine = this.getActiveMachineState();
      machine.remainingDolls = Math.max(0, machine.remainingDolls - 1);
    }
    this.attemptOpen = false;
    this.dropExecuted = false;
    this.currentStrong = false;
  }

  selectMachine(machineId: string): boolean {
    if (this.attemptOpen || !this.hasMachine(machineId)) return false;
    this.activeMachineId = machineId;
    return true;
  }

  refillCurrentMachine(): boolean {
    const machine = this.getActiveMachineState();
    if (this.attemptOpen || machine.remainingDolls !== 0) return false;
    machine.remainingDolls = this.getActiveMachineDefinition().batchSize;
    machine.layoutSequence += 1;
    return true;
  }

  exchange(premiumId: string): void {
    if (this.attemptOpen) throw new Error('exchange is not allowed during attempt');
    if (this.ordinaryDolls < this.exchangeCost) {
      throw new Error('insufficient ordinary dolls');
    }

    this.ordinaryDolls -= this.exchangeCost;
    this.premiumDolls.set(premiumId, (this.premiumDolls.get(premiumId) ?? 0) + 1);
  }

  exportPlayerState(): PrototypePlayerState {
    if (this.attemptOpen) throw new Error('cannot save active attempt');
    const machines: Record<string, MachineRuntimeState> = {};
    this.machineStates.forEach((state, id) => {
      machines[id] = { ...state };
    });
    return {
      coins: this.coins,
      ordinaryDolls: this.ordinaryDolls,
      premiumDolls: this.copyPremiumDolls(),
      selectedMachineId: this.activeMachineId,
      machines,
    };
  }

  snapshot(): PrototypeSnapshot {
    const machine = this.getActiveMachineState();
    return {
      coins: this.coins,
      cost: this.options.cost,
      ordinaryDolls: this.ordinaryDolls,
      premiumDolls: this.copyPremiumDolls(),
      exchangeCost: this.exchangeCost,
      attemptState: !this.attemptOpen
        ? 'waiting'
        : this.dropExecuted ? 'running' : 'ready',
      machineId: this.activeMachineId,
      remainingDolls: machine.remainingDolls,
      layoutSequence: machine.layoutSequence,
      needsRefill: machine.remainingDolls === 0,
    };
  }

  private prepareMissingMachineStates(): void {
    const missing = this.machineDefinitions.filter((machine) => !this.machineStates.has(machine.id));
    const needsTargetRepair = this.machineDefinitions.some((machine) => (
      (this.machineStates.get(machine.id)?.strongTarget ?? 0) < 1
    ));
    if (missing.length === 0 && !needsTargetRepair) return;

    // 同一次启动只读取一个初始随机值，让新增机台不会额外消耗原机台后续轮次的随机序列。
    const initialRandomValue = this.random();
    this.machineDefinitions.forEach((definition) => {
      const existing = this.machineStates.get(definition.id);
      if (existing) {
        if (existing.strongTarget < 1) {
          existing.strongTarget = this.createStrongTarget(existing.progress, initialRandomValue);
        }
        return;
      }
      this.machineStates.set(definition.id, {
        progress: 0,
        strongTarget: this.createStrongTarget(0, initialRandomValue),
        layoutSequence: 0,
        remainingDolls: definition.batchSize,
      });
    });
  }

  private createStrongTarget(progress: number, randomValue: number): number {
    return selectStrongAttempt(
      this.options.strongMaxAttempts,
      randomValue,
      Math.min(progress + 1, this.options.strongMaxAttempts),
    );
  }

  private getActiveMachineState(): MachineRuntimeState {
    const state = this.machineStates.get(this.activeMachineId);
    if (!state) throw new Error('active machine state is missing');
    return state;
  }

  private getActiveMachineDefinition(): HomeMachineDefinition {
    const definition = this.machineDefinitions.find((machine) => machine.id === this.activeMachineId);
    if (!definition) throw new Error('active machine definition is missing');
    return definition;
  }

  private hasMachine(machineId: string): boolean {
    return this.machineDefinitions.some((machine) => machine.id === machineId);
  }

  private copyPremiumDolls(): Record<string, number> {
    const premiumDolls: Record<string, number> = {};
    this.premiumDolls.forEach((count, id) => {
      premiumDolls[id] = count;
    });
    return premiumDolls;
  }
}
