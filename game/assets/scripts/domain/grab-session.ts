export type GrabState =
  | 'idle'
  | 'moving'
  | 'dropping'
  | 'grabbing'
  | 'lifting'
  | 'returning'
  | 'settled';

const NEXT_STATES: Record<GrabState, readonly GrabState[]> = {
  idle: ['moving'],
  moving: ['dropping'],
  dropping: ['grabbing'],
  grabbing: ['lifting'],
  lifting: ['returning'],
  returning: ['settled'],
  settled: ['idle'],
};

export class GrabSession {
  private current: GrabState = 'idle';

  get state(): GrabState {
    return this.current;
  }

  startMoving(): void {
    this.transition('moving');
  }

  startDropping(): void {
    this.transition('dropping');
  }

  startGrabbing(): void {
    this.transition('grabbing');
  }

  startLifting(): void {
    this.transition('lifting');
  }

  startReturning(): void {
    this.transition('returning');
  }

  settle(): void {
    this.transition('settled');
  }

  reset(): void {
    this.transition('idle');
  }

  abandon(): void {
    if (this.current !== 'moving') {
      throw new Error('abandon is only allowed while moving');
    }
    this.current = 'idle';
  }

  private transition(next: GrabState): void {
    // 所有入口共用一张状态表，禁止重复点击触发并行动画。
    if (NEXT_STATES[this.current].indexOf(next) === -1) {
      throw new Error(`invalid transition: ${this.current} -> ${next}`);
    }
    this.current = next;
  }
}
