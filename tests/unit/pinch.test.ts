import { describe, it, expect } from 'vitest';
import { normalizedPinchDistance, advancePinchState, type PinchState } from '../../src/lib/gesture/pinch';
import type { Hand } from '../../src/lib/vision/types';

function hand(
  thumbTip: [number, number],
  indexTip: [number, number],
  wrist: [number, number] = [0.5, 0.9],
  indexBase: [number, number] = [0.5, 0.5]
): Hand {
  const lm = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  lm[0] = { x: wrist[0], y: wrist[1], z: 0 };
  lm[4] = { x: thumbTip[0], y: thumbTip[1], z: 0 };
  lm[5] = { x: indexBase[0], y: indexBase[1], z: 0 };
  lm[8] = { x: indexTip[0], y: indexTip[1], z: 0 };
  return { landmarks: lm, confidence: 1 };
}

describe('normalizedPinchDistance', () => {
  it('returns small value when thumb and index touch', () => {
    const d = normalizedPinchDistance(hand([0.5, 0.5], [0.5, 0.5]));
    expect(d).toBeCloseTo(0);
  });

  it('returns larger value when thumb and index are far apart', () => {
    const d = normalizedPinchDistance(hand([0.5, 0.3], [0.5, 0.7]));
    expect(d).toBeGreaterThan(0.5);
  });
});

describe('advancePinchState', () => {
  const idle: PinchState = { kind: 'idle', heldMs: 0 };

  it('idle to pinching when distance crosses 0.45 threshold', () => {
    const next = advancePinchState(idle, 0.4, 16);
    expect(next.kind).toBe('pinching');
  });

  it('stays idle when distance is above 0.45', () => {
    const next = advancePinchState(idle, 0.5, 16);
    expect(next.kind).toBe('idle');
  });

  it('pinching to holding after 100 ms continuous pinch', () => {
    let s: PinchState = { kind: 'pinching', heldMs: 0 };
    s = advancePinchState(s, 0.4, 50);
    expect(s.kind).toBe('pinching');
    s = advancePinchState(s, 0.4, 60);
    expect(s.kind).toBe('holding');
  });

  it('holding to idle when distance rises above 0.55 (hysteresis)', () => {
    const holding: PinchState = { kind: 'holding', heldMs: 200 };
    const stillHeld = advancePinchState(holding, 0.5, 16);
    expect(stillHeld.kind).toBe('holding');
    const released = advancePinchState(holding, 0.56, 16);
    expect(released.kind).toBe('idle');
  });

  it('pinching to idle if distance jumps back above 0.45 before 100 ms', () => {
    const pinching: PinchState = { kind: 'pinching', heldMs: 30 };
    const next = advancePinchState(pinching, 0.5, 16);
    expect(next.kind).toBe('idle');
  });
});
