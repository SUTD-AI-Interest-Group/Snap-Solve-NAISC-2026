import { describe, it, expect } from 'vitest';
import {
  makeSolvedBoard,
  isAdjacentToEmpty,
  slide,
  correctCount,
  scrambleByRandomMoves,
  isSolved
} from '../../src/lib/game/board';

describe('makeSolvedBoard', () => {
  it('places pieces 0..7 in cells 0..7 and null in cell 8', () => {
    const b = makeSolvedBoard();
    expect(b.cells).toEqual([0, 1, 2, 3, 4, 5, 6, 7, null]);
    expect(b.emptyIndex).toBe(8);
    expect(b.correctCount).toBe(8);
  });
});

describe('isAdjacentToEmpty', () => {
  it('returns true for the four neighbors of the empty cell on a 3x3', () => {
    const b = makeSolvedBoard();
    expect(isAdjacentToEmpty(b, 7)).toBe(true);
    expect(isAdjacentToEmpty(b, 5)).toBe(true);
    expect(isAdjacentToEmpty(b, 6)).toBe(false);
    expect(isAdjacentToEmpty(b, 0)).toBe(false);
  });
});

describe('slide', () => {
  it('moves a piece into the empty cell and returns a new board', () => {
    const before = makeSolvedBoard();
    const after = slide(before, 7);
    expect(after.cells[7]).toBeNull();
    expect(after.cells[8]).toBe(7);
    expect(after.emptyIndex).toBe(7);
    expect(before.cells[7]).toBe(7);
  });

  it('returns the same board if the source is not adjacent', () => {
    const before = makeSolvedBoard();
    const after = slide(before, 0);
    expect(after).toBe(before);
  });
});

describe('correctCount', () => {
  it('counts pieces in their solved positions (empty does not count)', () => {
    const b = makeSolvedBoard();
    expect(correctCount(b)).toBe(8);
  });

  it('decreases after a single slide that misplaces a piece', () => {
    const b = makeSolvedBoard();
    const after = slide(b, 7);
    expect(correctCount(after)).toBe(7);
  });
});

describe('scrambleByRandomMoves', () => {
  it('produces a scrambled 9-cell board with one empty', () => {
    const b = scrambleByRandomMoves(80, () => 0.5);
    expect(b.cells.length).toBe(9);
    expect(b.cells.filter((c) => c === null).length).toBe(1);
  });

  it('with 0 moves returns solved', () => {
    const b = scrambleByRandomMoves(0, () => 0.5);
    expect(isSolved(b)).toBe(true);
  });
});

describe('isSolved', () => {
  it('true for the solved board', () => {
    expect(isSolved(makeSolvedBoard())).toBe(true);
  });
  it('false after one slide', () => {
    expect(isSolved(slide(makeSolvedBoard(), 7))).toBe(false);
  });
});
