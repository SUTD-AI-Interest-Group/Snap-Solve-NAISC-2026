import { describe, it, expect } from 'vitest';
import { rectFromCorners, clampToPlayerHalf, hasMinSize } from '../../src/lib/game/snip';

describe('rectFromCorners', () => {
  it('returns a normalized rect regardless of corner order', () => {
    const r = rectFromCorners({ x: 0.8, y: 0.6 }, { x: 0.2, y: 0.1 });
    expect(r.x).toBeCloseTo(0.2);
    expect(r.y).toBeCloseTo(0.1);
    expect(r.w).toBeCloseTo(0.6);
    expect(r.h).toBeCloseTo(0.5);
  });
});

describe('clampToPlayerHalf', () => {
  it('clamps p1 x to [0, 0.5]', () => {
    expect(clampToPlayerHalf({ x: 0.7, y: 0.3 }, 'p1')).toEqual({ x: 0.5, y: 0.3 });
    expect(clampToPlayerHalf({ x: 0.2, y: 0.3 }, 'p1')).toEqual({ x: 0.2, y: 0.3 });
  });
  it('clamps p2 x to [0.5, 1]', () => {
    expect(clampToPlayerHalf({ x: 0.2, y: 0.3 }, 'p2')).toEqual({ x: 0.5, y: 0.3 });
    expect(clampToPlayerHalf({ x: 0.8, y: 0.3 }, 'p2')).toEqual({ x: 0.8, y: 0.3 });
  });
});

describe('hasMinSize', () => {
  it('requires w*videoW and h*videoH to each meet the min', () => {
    const r = { x: 0, y: 0, w: 0.15, h: 0.25 };
    expect(hasMinSize(r, 1280, 720, 150)).toBe(true);
    expect(hasMinSize(r, 800, 400, 150)).toBe(false);
  });
});
