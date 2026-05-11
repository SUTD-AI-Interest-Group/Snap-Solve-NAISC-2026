import { describe, it, expect } from 'vitest';
import { pieceRect } from '../../src/lib/game/slicer';

describe('pieceRect', () => {
  it('returns the rect of piece N within a snip of dimensions w*h', () => {
    expect(pieceRect(0, 300, 300)).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    expect(pieceRect(4, 300, 300)).toEqual({ x: 100, y: 100, w: 100, h: 100 });
    expect(pieceRect(8, 300, 300)).toEqual({ x: 200, y: 200, w: 100, h: 100 });
  });

  it('handles non-divisible dimensions by flooring', () => {
    const r = pieceRect(8, 301, 301);
    expect(r.x + r.w).toBeLessThanOrEqual(301);
  });
});
