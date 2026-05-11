import { describe, it, expect } from 'vitest';
import {
  makeSolvedBoard,
  swap,
  correctCount,
  scrambleSwap,
  isSolved
} from '../../src/lib/game/board';

describe('makeSolvedBoard', () => {
  it('places pieces 0..8 in cells 0..8 (no null)', () => {
    const b = makeSolvedBoard();
    expect(b.cells).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(b.correctCount).toBe(9);
    expect(b.heldBy).toBeNull();
    expect(b.heldPieceCell).toBe(-1);
    expect(b.heldCursor).toBeNull();
  });
});

describe('swap', () => {
  it('exchanges two distinct cells and updates correctCount', () => {
    const before = makeSolvedBoard();
    const after = swap(before, 0, 8);
    expect(after.cells[0]).toBe(8);
    expect(after.cells[8]).toBe(0);
    expect(after.correctCount).toBe(7);
    expect(before.cells[0]).toBe(0);
    expect(before.cells[8]).toBe(8);
  });

  it('clears any held state', () => {
    const before: ReturnType<typeof makeSolvedBoard> = {
      ...makeSolvedBoard(),
      heldBy: 'p1',
      heldPieceCell: 0,
      heldCursor: { x: 0.5, y: 0.5 }
    };
    const after = swap(before, 0, 1);
    expect(after.heldBy).toBeNull();
    expect(after.heldPieceCell).toBe(-1);
    expect(after.heldCursor).toBeNull();
  });

  it('is a no-op when source equals target', () => {
    const before = makeSolvedBoard();
    const after = swap(before, 4, 4);
    expect(after.cells).toEqual(before.cells);
    expect(after.correctCount).toBe(before.correctCount);
  });
});

describe('correctCount', () => {
  it('returns 9 for the solved board', () => {
    expect(correctCount(makeSolvedBoard())).toBe(9);
  });

  it('returns 7 after one swap of two correct cells', () => {
    const b = swap(makeSolvedBoard(), 0, 1);
    expect(correctCount(b)).toBe(7);
  });
});

describe('isSolved', () => {
  it('true for the solved board', () => {
    expect(isSolved(makeSolvedBoard())).toBe(true);
  });

  it('false after one swap', () => {
    expect(isSolved(swap(makeSolvedBoard(), 0, 1))).toBe(false);
  });
});

describe('scrambleSwap', () => {
  it('returns a permutation of 0..8', () => {
    let i = 0;
    const rng = () => {
      const seq = [0.1, 0.7, 0.3, 0.9, 0.2, 0.5, 0.85, 0.05, 0.6, 0.45, 0.95, 0.15];
      return seq[i++ % seq.length];
    };
    const b = scrambleSwap(rng, 0);
    expect(b.cells.length).toBe(9);
    expect([...b.cells].sort((a, c) => a - c)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('respects minOutOfPlace (re-rolls until enough pieces are displaced)', () => {
    let calls = 0;
    const rng = () => {
      calls++;
      if (calls <= 9) return 0.999;
      return [0.1, 0.7, 0.3, 0.9, 0.2, 0.5][calls % 6];
    };
    const b = scrambleSwap(rng, 7);
    const displaced = b.cells.reduce((n: number, v, i) => (v !== i ? n + 1 : n), 0);
    expect(displaced).toBeGreaterThanOrEqual(7);
  });

  it('with minOutOfPlace=0 accepts the very first shuffle', () => {
    const rng = () => 0.5;
    const b = scrambleSwap(rng, 0);
    expect(b.cells.length).toBe(9);
  });
});
