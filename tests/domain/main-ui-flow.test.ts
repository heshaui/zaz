import { describe, expect, it } from 'vitest';
import {
  createInitialMainUiFlow,
  reduceMainUiFlow,
} from '../../game/assets/scripts/domain/main-ui-flow';

describe('main UI flow', () => {
  it('starts at the idle home state', () => {
    expect(createInitialMainUiFlow()).toEqual({
      phase: 'home',
      layer: 'none',
      outcome: null,
      needsRefill: false,
    });
  });

  it('moves an accepted paid round from aiming into running', () => {
    const aiming = reduceMainUiFlow(createInitialMainUiFlow(), { type: 'COIN_ACCEPTED' });
    const running = reduceMainUiFlow(aiming, { type: 'DROP_STARTED' });

    expect(aiming).toEqual({ phase: 'aiming', layer: 'none', outcome: null, needsRefill: false });
    expect(running).toEqual({ phase: 'running', layer: 'none', outcome: null, needsRefill: false });
  });

  it('opens a settled result with its refill marker', () => {
    const running = reduceMainUiFlow(
      reduceMainUiFlow(createInitialMainUiFlow(), { type: 'COIN_ACCEPTED' }),
      { type: 'DROP_STARTED' },
    );

    expect(reduceMainUiFlow(running, {
      type: 'ROUND_SETTLED', outcome: 'won', needsRefill: true,
    })).toEqual({
      phase: 'home', layer: 'result', outcome: 'won', needsRefill: true,
    });
  });

  it('closes a result directly to home when no refill is needed', () => {
    const state = {
      phase: 'home' as const, layer: 'result' as const, outcome: 'missed' as const, needsRefill: false,
    };

    expect(reduceMainUiFlow(state, { type: 'CLOSE_RESULT' })).toEqual({
      phase: 'home', layer: 'none', outcome: null, needsRefill: false,
    });
  });

  it('defers an empty batch refill until after the result closes', () => {
    const result = {
      phase: 'home' as const, layer: 'result' as const, outcome: 'won' as const, needsRefill: true,
    };
    const refilling = reduceMainUiFlow(result, { type: 'CLOSE_RESULT' });

    expect(refilling).toEqual({
      phase: 'home', layer: 'refilling', outcome: 'won', needsRefill: true,
    });
    expect(reduceMainUiFlow(refilling, { type: 'REFILL_FINISHED' })).toEqual({
      phase: 'home', layer: 'none', outcome: null, needsRefill: false,
    });
  });

  it('opens and closes the collection only while idle at home', () => {
    const collection = reduceMainUiFlow(createInitialMainUiFlow(), { type: 'OPEN_COLLECTION' });

    expect(collection).toEqual({
      phase: 'home', layer: 'collection', outcome: null, needsRefill: false,
    });
    expect(reduceMainUiFlow(collection, { type: 'CLOSE_COLLECTION' })).toEqual({
      phase: 'home', layer: 'none', outcome: null, needsRefill: false,
    });
  });

  it('cancels or confirms a paid-round exit from aiming', () => {
    const aiming = reduceMainUiFlow(createInitialMainUiFlow(), { type: 'COIN_ACCEPTED' });
    const confirmation = reduceMainUiFlow(aiming, { type: 'REQUEST_EXIT' });

    expect(confirmation).toEqual({
      phase: 'aiming', layer: 'exit-confirm', outcome: null, needsRefill: false,
    });
    expect(reduceMainUiFlow(confirmation, { type: 'CANCEL_EXIT' })).toEqual({
      phase: 'aiming', layer: 'none', outcome: null, needsRefill: false,
    });
    expect(reduceMainUiFlow(confirmation, { type: 'CONFIRM_EXIT' })).toEqual({
      phase: 'home', layer: 'none', outcome: null, needsRefill: false,
    });
  });

  it('returns the same object for actions that do not apply to the current state', () => {
    const state = createInitialMainUiFlow();
    const aiming = reduceMainUiFlow(state, { type: 'COIN_ACCEPTED' });
    const running = reduceMainUiFlow(aiming, { type: 'DROP_STARTED' });

    expect(reduceMainUiFlow(state, { type: 'DROP_STARTED' })).toBe(state);
    expect(reduceMainUiFlow(state, { type: 'REQUEST_EXIT' })).toBe(state);
    expect(reduceMainUiFlow(state, { type: 'OPEN_COLLECTION' })).not.toBe(state);
    expect(reduceMainUiFlow(aiming, { type: 'OPEN_COLLECTION' })).toBe(aiming);
    expect(reduceMainUiFlow(running, { type: 'OPEN_COLLECTION' })).toBe(running);
    expect(reduceMainUiFlow(state, { type: 'REQUEST_EXIT' })).toBe(state);
    expect(reduceMainUiFlow(running, { type: 'REQUEST_EXIT' })).toBe(running);
  });
});
