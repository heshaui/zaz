import { describe, expect, it } from 'vitest';
import { GrabSession } from '../../game/assets/scripts/domain/grab-session';

describe('GrabSession', () => {
  it('按完整动作顺序流转', () => {
    const session = new GrabSession();
    session.startMoving();
    session.startDropping();
    session.startGrabbing();
    session.startLifting();
    session.startReturning();
    session.settle();

    expect(session.state).toBe('settled');
  });

  it('拒绝重复下爪', () => {
    const session = new GrabSession();
    session.startMoving();
    session.startDropping();

    expect(() => session.startDropping()).toThrow('invalid transition');
  });

  it('重置后允许开始下一局', () => {
    const session = new GrabSession();
    session.startMoving();
    session.startDropping();
    session.startGrabbing();
    session.startLifting();
    session.startReturning();
    session.settle();
    session.reset();

    expect(session.state).toBe('idle');
  });
});
