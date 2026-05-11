import { describe, it, expect } from 'vitest';
import { assignHandsToPlayers } from '../../src/lib/gesture/assign';
import type { Hand } from '../../src/lib/vision/types';

function hand(wristX: number, wristY = 0.5): Hand {
  const lm = Array.from({ length: 21 }, () => ({ x: wristX, y: wristY, z: 0 }));
  return { landmarks: lm, confidence: 1 };
}

describe('assignHandsToPlayers', () => {
  it('assigns hands by wrist x: <0.5 to p1, >=0.5 to p2', () => {
    const hands = [hand(0.2), hand(0.4), hand(0.6), hand(0.8)];
    const out = assignHandsToPlayers(hands);
    expect(out.p1.left?.landmarks[0].x).toBe(0.2);
    expect(out.p1.right?.landmarks[0].x).toBe(0.4);
    expect(out.p2.left?.landmarks[0].x).toBe(0.6);
    expect(out.p2.right?.landmarks[0].x).toBe(0.8);
  });

  it('handles single-hand players', () => {
    const out = assignHandsToPlayers([hand(0.3), hand(0.7)]);
    expect(out.p1.left?.landmarks[0].x).toBe(0.3);
    expect(out.p1.right).toBeNull();
    expect(out.p2.left?.landmarks[0].x).toBe(0.7);
    expect(out.p2.right).toBeNull();
  });

  it('drops extra hands beyond 2 per player (keeps the 2 most central vertically)', () => {
    const hands = [hand(0.1, 0.1), hand(0.2, 0.5), hand(0.3, 0.55)];
    const out = assignHandsToPlayers(hands);
    const xs = [out.p1.left?.landmarks[0].x, out.p1.right?.landmarks[0].x]
      .filter((x): x is number => x != null)
      .sort();
    expect(xs).toEqual([0.2, 0.3]);
  });

  it('returns nulls for missing hands', () => {
    const out = assignHandsToPlayers([]);
    expect(out.p1.left).toBeNull();
    expect(out.p1.right).toBeNull();
    expect(out.p2.left).toBeNull();
    expect(out.p2.right).toBeNull();
  });
});
