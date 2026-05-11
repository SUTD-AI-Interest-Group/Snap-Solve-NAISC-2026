import type { PieceId, PlayerId, Point } from '../vision/types';

export type Board = {
  cells: (PieceId | null)[];
  emptyIndex: number;
  correctCount: number;
  heldBy: PlayerId | null;
  heldPieceCell: number;
  heldCursor: Point | null;
};

const SIZE = 3;
const CELLS = SIZE * SIZE;

export function makeSolvedBoard(): Board {
  const cells: (PieceId | null)[] = [0, 1, 2, 3, 4, 5, 6, 7, null];
  return {
    cells,
    emptyIndex: 8,
    correctCount: 8,
    heldBy: null,
    heldPieceCell: -1,
    heldCursor: null
  };
}

export function isSolved(b: Board): boolean {
  for (let i = 0; i < CELLS - 1; i++) if (b.cells[i] !== (i as PieceId)) return false;
  return b.cells[CELLS - 1] === null;
}

function rowCol(idx: number): [number, number] {
  return [Math.floor(idx / SIZE), idx % SIZE];
}

export function isAdjacentToEmpty(b: Board, idx: number): boolean {
  if (idx === b.emptyIndex || idx < 0 || idx >= CELLS) return false;
  const [r1, c1] = rowCol(idx);
  const [r2, c2] = rowCol(b.emptyIndex);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

export function slide(b: Board, fromIdx: number): Board {
  if (!isAdjacentToEmpty(b, fromIdx)) return b;
  const cells = b.cells.slice();
  cells[b.emptyIndex] = cells[fromIdx];
  cells[fromIdx] = null;
  const next: Board = {
    cells,
    emptyIndex: fromIdx,
    correctCount: 0,
    heldBy: null,
    heldPieceCell: -1,
    heldCursor: null
  };
  next.correctCount = correctCount(next);
  return next;
}

export function correctCount(b: Board): number {
  let n = 0;
  for (let i = 0; i < CELLS; i++) {
    const c = b.cells[i];
    if (c !== null && c === (i as PieceId)) n++;
  }
  return n;
}

function neighborsOfEmpty(b: Board): number[] {
  const [r, c] = rowCol(b.emptyIndex);
  const out: number[] = [];
  if (r > 0) out.push(b.emptyIndex - SIZE);
  if (r < SIZE - 1) out.push(b.emptyIndex + SIZE);
  if (c > 0) out.push(b.emptyIndex - 1);
  if (c < SIZE - 1) out.push(b.emptyIndex + 1);
  return out;
}

export function scrambleByRandomMoves(n: number, rng: () => number = Math.random): Board {
  let b = makeSolvedBoard();
  let lastFrom = -1;
  for (let i = 0; i < n; i++) {
    const options = neighborsOfEmpty(b).filter((idx) => idx !== lastFrom);
    const pick = options[Math.floor(rng() * options.length)];
    lastFrom = b.emptyIndex;
    b = slide(b, pick);
  }
  return b;
}
