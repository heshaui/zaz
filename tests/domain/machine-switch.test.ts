import { describe, expect, it } from 'vitest';
import * as machineSwitch from '../../game/assets/scripts/domain/machine-switch';

const { canSelectMachine } = machineSwitch;

const allowed = {
  known: true,
  sameMachine: false,
  sessionState: 'idle' as const,
  attemptState: 'waiting' as const,
  uiPhase: 'home' as const,
  uiLayer: 'none' as const,
  transitioning: false,
};

describe('machine switch gate', () => {
  it('首页空闲且未投币时允许选择另一台已知机台', () => {
    expect(canSelectMachine(allowed)).toBe(true);
  });

  it.each([
    { ...allowed, known: false },
    { ...allowed, sameMachine: true },
    { ...allowed, sessionState: 'moving' as const },
    { ...allowed, attemptState: 'ready' as const },
    { ...allowed, uiPhase: 'aiming' as const },
    { ...allowed, uiLayer: 'collection' as const },
    { ...allowed, transitioning: true },
  ])('任一前置条件不满足时拒绝切换 %#', (options) => {
    expect(canSelectMachine(options)).toBe(false);
  });
});

describe('machine switch motion', () => {
  const createMotion = (
    machineSwitch as unknown as {
      createMachineSwitchMotion?: (direction: -1 | 1) => unknown;
    }
  ).createMachineSwitchMotion;

  it('向右选择时先向左退出，再从右侧柔和进入', () => {
    expect(createMotion).toBeTypeOf('function');
    if (!createMotion) return;

    expect(createMotion(1)).toEqual({
      outgoingEndX: -0.16,
      outgoingDuration: 0.14,
      outgoingEasing: 'quadIn',
      incomingStartX: 0.16,
      incomingDuration: 0.22,
      incomingEasing: 'quadOut',
    });
  });

  it('向左选择时使用对称位移与相同节奏', () => {
    expect(createMotion).toBeTypeOf('function');
    if (!createMotion) return;

    expect(createMotion(-1)).toEqual({
      outgoingEndX: 0.16,
      outgoingDuration: 0.14,
      outgoingEasing: 'quadIn',
      incomingStartX: -0.16,
      incomingDuration: 0.22,
      incomingEasing: 'quadOut',
    });
  });
});
