import {
  advanceRandomCycle,
  selectStrongAttempt,
} from './grab-rules';
import type { PrototypePlayerState } from './prototype-save';

interface PrototypeStoreOptions {
  coins: number;
  cost: number;
  strongMaxAttempts: number;
  exchangeCost?: number;
  playerState?: PrototypePlayerState;
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
}

export class PrototypeStore {
  private coins: number;
  private progress = 0;
  private strongTarget: number;
  private ordinaryDolls = 0;
  private readonly premiumDolls = new Map<string, number>();
  private readonly exchangeCost: number;
  private attemptOpen = false;
  private dropExecuted = false;
  private currentStrong = false;
  private readonly random: () => number;

  constructor(private readonly options: PrototypeStoreOptions) {
    if (!Number.isInteger(options.strongMaxAttempts) || options.strongMaxAttempts < 1) {
      throw new Error('max attempts must be >= 1');
    }
    const playerState = options.playerState;
    this.random = options.random ?? Math.random;
    this.coins = playerState?.coins ?? options.coins;
    this.progress = playerState?.progress ?? 0;
    const firstAvailableAttempt = Math.min(
      this.progress + 1,
      options.strongMaxAttempts,
    );
    this.strongTarget = playerState?.strongTarget
      ?? selectStrongAttempt(
        options.strongMaxAttempts,
        this.random(),
        firstAvailableAttempt,
      );
    this.ordinaryDolls = playerState?.ordinaryDolls ?? 0;
    Object.keys(playerState?.premiumDolls ?? {}).forEach((id) => {
      this.premiumDolls.set(id, playerState!.premiumDolls[id]);
    });
    this.exchangeCost = options.exchangeCost ?? 10;
    if (!Number.isInteger(this.exchangeCost) || this.exchangeCost < 1) {
      throw new Error('exchange cost must be >= 1');
    }
  }

  startAttempt(): { coins: number } {
    if (this.attemptOpen) {
      throw new Error('attempt already open');
    }
    if (this.coins < this.options.cost) {
      throw new Error('insufficient coins');
    }

    this.coins -= this.options.cost;
    this.attemptOpen = true;
    this.dropExecuted = false;
    this.currentStrong = false;
    return { coins: this.coins };
  }

  abandonAttempt(): void {
    if (!this.attemptOpen || this.dropExecuted) {
      throw new Error('abandon is not allowed');
    }

    // 放弃只关闭已经付费但尚未下爪的回合，币数和隐藏周期均保持现状。
    this.attemptOpen = false;
    this.dropExecuted = false;
    this.currentStrong = false;
  }

  executeDrop(): { isStrong: boolean } {
    if (!this.attemptOpen || this.dropExecuted) {
      throw new Error('drop is not allowed');
    }

    // 只有当前周期结束时才读取下一随机值，普通轮次不会提前改变后续结果。
    const reachesTarget = this.progress + 1 >= Math.min(
      this.strongTarget,
      this.options.strongMaxAttempts,
    );
    const result = advanceRandomCycle({
      progress: this.progress,
      strongAt: this.strongTarget,
      maxAttempts: this.options.strongMaxAttempts,
      nextRandomValue: reachesTarget ? this.random() : 0,
    });
    this.progress = result.nextProgress;
    this.strongTarget = result.nextStrongAt;
    this.currentStrong = result.isStrong;
    this.dropExecuted = true;
    return { isStrong: this.currentStrong };
  }

  settleAttempt(won: boolean): void {
    if (!this.attemptOpen || !this.dropExecuted) {
      throw new Error('attempt is not ready to settle');
    }

    // 强弱状态由下爪时的周期结果保存，结算调用方无法伪造强爪。
    if (won) {
      this.ordinaryDolls += 1;
    }
    this.attemptOpen = false;
    this.dropExecuted = false;
    this.currentStrong = false;
  }

  exchange(premiumId: string): void {
    if (this.attemptOpen) {
      throw new Error('exchange is not allowed during attempt');
    }
    if (this.ordinaryDolls < this.exchangeCost) {
      throw new Error('insufficient ordinary dolls');
    }

    this.ordinaryDolls -= this.exchangeCost;
    this.premiumDolls.set(premiumId, (this.premiumDolls.get(premiumId) ?? 0) + 1);
  }

  exportPlayerState(): PrototypePlayerState {
    if (this.attemptOpen) {
      throw new Error('cannot save active attempt');
    }
    return {
      coins: this.coins,
      progress: this.progress,
      strongTarget: this.strongTarget,
      ordinaryDolls: this.ordinaryDolls,
      premiumDolls: this.copyPremiumDolls(),
    };
  }

  snapshot(): PrototypeSnapshot {
    return {
      coins: this.coins,
      cost: this.options.cost,
      ordinaryDolls: this.ordinaryDolls,
      premiumDolls: this.copyPremiumDolls(),
      exchangeCost: this.exchangeCost,
      attemptState: !this.attemptOpen
        ? 'waiting'
        : this.dropExecuted ? 'running' : 'ready',
    };
  }

  private copyPremiumDolls(): Record<string, number> {
    const premiumDolls: Record<string, number> = {};
    this.premiumDolls.forEach((count, id) => {
      premiumDolls[id] = count;
    });
    return premiumDolls;
  }
}
