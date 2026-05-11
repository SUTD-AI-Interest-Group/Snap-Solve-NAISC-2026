import { describe, it, expect } from 'vitest';
import { getCursorPoint } from '../../src/lib/gesture/cursor';
import type { Hand } from '../../src/lib/vision/types';

function hand(thumb: [number, number], index: [number, number]): Hand {
  const lm = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  lm[4] = { x: thumb[0], y: thumb[1], z: 0 };
  lm[8] = { x: index[0], y: index[1], z: 0 };
  return { landmarks: lm, confidence: 1 };
}

describe('getCursorPoint', () => {
  it('returns midpoint of thumb tip and index tip', () => {
    const p = getCursorPoint(hand([0.2, 0.4], [0.6, 0.8]));
    expect(p.x).toBeCloseTo(0.4);
    expect(p.y).toBeCloseTo(0.6);
  });
});
