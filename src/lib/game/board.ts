import type { PieceId, PlayerId, Point } from '../vision/types';

const SIZE = 3;
const CELLS = SIZE * SIZE;

export type Board = {
  cells: PieceId[];
  correctCount: number;
  heldBy: PlayerId | null;
  heldPieceCell: number;
  heldCursor: Point | null;
};

const CLEARED_HELD = {
  heldBy: null as PlayerId | null,
  heldPieceCell: -1,
  heldCursor: null as Point | null
};

export function makeSolvedBoard(): Board {
  const cells: PieceId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return { cells, correctCount: CELLS, ...CLEARED_HELD };
}

export function correctCount(b: Board): number {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (b.cells[i] === (i as PieceId)) n++;
  return n;
}

export function isSolved(b: Board): boolean {
  for (let i = 0; i < CELLS; i++) if (b.cells[i] !== (i as PieceId)) return false;
  return true;
}

export function swap(b: Board, a: number, c: number): Board {
  const cells = b.cells.slice() as PieceId[];
  if (a !== c) {
    const tmp = cells[a];
    cells[a] = cells[c];
    cells[c] = tmp;
  }
  const next: Board = { cells, correctCount: 0, ...CLEARED_HELD };
  next.correctCount = correctCount(next);
  return next;
}

export function scrambleSwap(
  rng: () => number = Math.random,
  minOutOfPlace = 7
): Board {
  const cap = Math.min(minOutOfPlace, CELLS);
  for (let attempts = 0; attempts < 1000; attempts++) {
    const cells: PieceId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = CELLS - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = cells[i];
      cells[i] = cells[j];
      cells[j] = tmp;
    }
    let displaced = 0;
    for (let i = 0; i < CELLS; i++) if (cells[i] !== (i as PieceId)) displaced++;
    if (displaced >= cap) {
      const b: Board = { cells, correctCount: CELLS - displaced, ...CLEARED_HELD };
      return b;
    }
  }
  const cells: PieceId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const tmp = cells[0];
  cells[0] = cells[1];
  cells[1] = tmp;
  return { cells, correctCount: CELLS - 2, ...CLEARED_HELD };
}
