import type { Hand } from '../vision/types';
import { LM } from '../vision/types';

export type PinchState =
  | { kind: 'idle'; heldMs: number }
  | { kind: 'pinching'; heldMs: number }
  | { kind: 'holding'; heldMs: number };

const ENGAGE = 0.45;
const RELEASE = 0.55;
const HOLD_DEBOUNCE_MS = 100;

export function normalizedPinchDistance(hand: Hand): number {
  const t = hand.landmarks[LM.THUMB_TIP];
  const i = hand.landmarks[LM.INDEX_TIP];
  const w = hand.landmarks[LM.WRIST];
  const ib = hand.landmarks[LM.INDEX_BASE];
  const tipDist = Math.hypot(t.x - i.x, t.y - i.y);
  const handSize = Math.hypot(w.x - ib.x, w.y - ib.y) || 1e-6;
  return tipDist / handSize;
}

export function advancePinchState(prev: PinchState, distance: number, dtMs: number): PinchState {
  switch (prev.kind) {
    case 'idle':
      return distance < ENGAGE ? { kind: 'pinching', heldMs: 0 } : { kind: 'idle', heldMs: 0 };
    case 'pinching': {
      if (distance >= ENGAGE) return { kind: 'idle', heldMs: 0 };
      const next = prev.heldMs + dtMs;
      return next >= HOLD_DEBOUNCE_MS
        ? { kind: 'holding', heldMs: next }
        : { kind: 'pinching', heldMs: next };
    }
    case 'holding':
      return distance > RELEASE
        ? { kind: 'idle', heldMs: 0 }
        : { kind: 'holding', heldMs: prev.heldMs + dtMs };
  }
}
