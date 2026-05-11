# Drag-and-Swap Puzzle Mechanic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 8-piece-plus-one-hole sliding puzzle with a 9-piece drag-and-swap mechanic — pinch any piece, drag over another, release to swap.

**Architecture:** Rewrite `src/lib/game/board.ts` with a new `Board` type (no null, no `emptyIndex`) and new pure helpers (`swap`, `scrambleSwap`). Update `tick.ts` so pickup has no adjacency gate and release commits a swap. Update `drawPuzzle.ts` so the lifted piece's origin cell shows a dashed placeholder and the hover-target cell glows. One atomic refactor task (Task 1) lands the new mechanic with the codebase still compiling and tests still passing; a follow-up task (Task 2) adds the visual polish.

**Tech Stack:** TypeScript 5, Vitest 4, Svelte 5 (game integration is unchanged at the call sites — `tick()` and `drawBoard()` keep the same external signatures).

**Spec:** [`docs/superpowers/specs/2026-05-11-drag-and-swap-design.md`](../specs/2026-05-11-drag-and-swap-design.md)

---

## File Structure

```
src/lib/
  game/
    board.ts       # REWRITTEN — new Board type, swap, scrambleSwap; slide/empty removed
    tick.ts        # CHANGED — applyPlayerHold body, win condition, scramble call
  render/
    drawPuzzle.ts  # CHANGED — slidable highlight removed; origin placeholder + target glow added
tests/unit/
  board.test.ts    # REWRITTEN
  tick.test.ts     # CHANGED — solve drag/drop test updated to assert swap semantics
```

Two tasks. Task 1 is the atomic refactor (all 5 files touched together so each commit leaves the codebase buildable and tests green). Task 2 is the visual polish on top.

---

## Task 1: Atomic refactor — board API + all consumers + tests

This task lands the new gameplay in a single commit. The codebase doesn't compile between the file edits; we only commit once everything is consistent and tests pass.

**Files:**
- Create / overwrite: `src/lib/game/board.ts`
- Modify: `src/lib/game/tick.ts`
- Modify: `src/lib/render/drawPuzzle.ts` (minimum changes to compile only — visuals are Task 2)
- Overwrite: `tests/unit/board.test.ts`
- Modify: `tests/unit/tick.test.ts`

- [ ] **Step 1: Write the new `board.test.ts` (red — won't compile yet)**

Overwrite `tests/unit/board.test.ts` with:

```ts
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
    // Returns a new board, doesn't mutate.
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
    // Deterministic RNG so the test is stable.
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
    // First permutation will be the identity (no out-of-place). Second will be a real shuffle.
    const rng = () => {
      calls++;
      // Identity-producing sequence for the first 9 picks: each Fisher-Yates pick selects the
      // current index (i.e. ratio so floor(r * (i+1)) === i). After that, return varied values.
      if (calls <= 9) return 0.999;
      return [0.1, 0.7, 0.3, 0.9, 0.2, 0.5][calls % 6];
    };
    const b = scrambleSwap(rng, 7);
    const displaced = b.cells.reduce((n, v, i) => (v !== i ? n + 1 : n), 0);
    expect(displaced).toBeGreaterThanOrEqual(7);
  });

  it('with minOutOfPlace=0 accepts the very first shuffle', () => {
    const rng = () => 0.5;
    const b = scrambleSwap(rng, 0);
    expect(b.cells.length).toBe(9);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails to compile**

Run from `/Users/angks/projects/SUTD/SUTD_AIIG/NAISC_Mediapipe`:

```bash
npm test -- board
```

Expected: FAILS. Either a TS-level "Module '../../src/lib/game/board' has no exported member 'swap'" error or runtime errors for missing functions.

- [ ] **Step 3: Rewrite `src/lib/game/board.ts`**

Overwrite `src/lib/game/board.ts` with:

```ts
import type { PieceId, PlayerId, Point } from '../vision/types';

const SIZE = 3;
const CELLS = SIZE * SIZE;

export type Board = {
  cells: PieceId[]; // length 9, permutation of 0..8 — every piece is exactly somewhere
  correctCount: number; // 0..9
  heldBy: PlayerId | null;
  heldPieceCell: number; // -1 if nothing held
  heldCursor: Point | null; // board-local coords, 0..1
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

// Returns a new board with cells[a] and cells[c] exchanged, correctCount recomputed,
// and held-state cleared. If a === c, returns an equivalent cleared-held board.
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

// Fisher-Yates shuffle that re-rolls until at least `minOutOfPlace` pieces are
// displaced from their solved positions. Every permutation of 9 elements is a
// reachable position via swaps, so solvability is never a concern.
export function scrambleSwap(
  rng: () => number = Math.random,
  minOutOfPlace = 7
): Board {
  const cap = Math.min(minOutOfPlace, CELLS);
  // Bounded loop guards against pathological RNGs.
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
  // Fallback: produce a definitively non-solved board by rotating one swap.
  const cells: PieceId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const tmp = cells[0];
  cells[0] = cells[1];
  cells[1] = tmp;
  return { cells, correctCount: CELLS - 2, ...CLEARED_HELD };
}
```

- [ ] **Step 4: Run the board tests to confirm they pass**

```bash
npm test -- board
```

Expected: 11 tests pass (3 makeSolvedBoard contracts + 3 swap + 2 correctCount + 2 isSolved + 3 scrambleSwap).

Don't commit yet — `tick.ts` and `drawPuzzle.ts` and `tick.test.ts` are now broken at the type level.

- [ ] **Step 5: Update `src/lib/game/tick.ts`**

Open `src/lib/game/tick.ts`. Make three changes:

**5a. Imports (lines 11–16).** Replace:

```ts
import {
  isAdjacentToEmpty,
  slide as boardSlide,
  scrambleByRandomMoves,
  makeSolvedBoard
} from './board';
```

with:

```ts
import { scrambleSwap, swap as boardSwap } from './board';
```

(`makeSolvedBoard` was unused in `tick.ts` and `isAdjacentToEmpty`/`slide`/`scrambleByRandomMoves` are gone.)

**5b. Replace the `applyPlayerHold` function (lines 76–110).** The current implementation gates pickup on adjacency and commits via `boardSlide`. The new one has no adjacency gate and commits via `boardSwap`. Replace the entire function body with:

```ts
function applyPlayerHold(
  board: Board,
  player: PlayerId,
  hands: { left: HandGesture; right: HandGesture }
): Board {
  const active =
    hands.left.present && hands.left.pinch === 'holding'
      ? hands.left
      : hands.right.present && hands.right.pinch === 'holding'
        ? hands.right
        : null;

  if (active) {
    const local = cursorToBoardLocal(active.cursor, player);
    const cell = boardCellAt(local);
    if (board.heldBy === player) {
      // Already holding — keep following the cursor.
      return { ...board, heldCursor: local };
    }
    if (cell >= 0) {
      // Pick up the piece at this cell. No adjacency check — any piece is grabbable.
      return { ...board, heldBy: player, heldPieceCell: cell, heldCursor: local };
    }
    return board;
  }

  // Released.
  if (board.heldBy === player) {
    const origin = board.heldPieceCell;
    const dropCell = boardCellAt(board.heldCursor ?? { x: -1, y: -1 });
    const valid = dropCell >= 0 && dropCell !== origin;
    if (valid) return boardSwap(board, origin, dropCell);
    return { ...board, heldBy: null, heldPieceCell: -1, heldCursor: null };
  }
  return board;
}
```

**5c. Update the solve-phase win condition and scramble call.**

Find the countdown→solve transition (currently lines 188–197):

```ts
const p1Board = scrambleByRandomMoves(80);
const p2Board = scrambleByRandomMoves(80);
return {
  phase: 'solve',
  remainingMs: SOLVE_DURATION_MS,
  startMs: SOLVE_DURATION_MS,
  p1: { ...state.p1, board: p1Board },
  p2: { ...state.p2, board: p2Board }
};
```

Replace the two `scrambleByRandomMoves(80)` calls with `scrambleSwap()`:

```ts
const p1Board = scrambleSwap();
const p2Board = scrambleSwap();
return {
  phase: 'solve',
  remainingMs: SOLVE_DURATION_MS,
  startMs: SOLVE_DURATION_MS,
  p1: { ...state.p1, board: p1Board },
  p2: { ...state.p2, board: p2Board }
};
```

Then find the solve-phase win checks (currently lines 207–208):

```ts
const p1Won = p1Board.correctCount === 8 && p1Board.cells[8] === null;
const p2Won = p2Board.correctCount === 8 && p2Board.cells[8] === null;
```

Replace with:

```ts
const p1Won = p1Board.correctCount === 9;
const p2Won = p2Board.correctCount === 9;
```

- [ ] **Step 6: Update `tests/unit/tick.test.ts`**

Open `tests/unit/tick.test.ts`. Three changes:

**6a. Imports (line 4):**

```ts
import { makeSolvedBoard, slide as bSlide } from '../../src/lib/game/board';
```

Replace with:

```ts
import { makeSolvedBoard, swap as bSwap } from '../../src/lib/game/board';
```

**6b. The "declares p1 as winner when p1.board is solved" test (around line 117–129).** It currently builds an unsolved p2 board with `bSlide(makeSolvedBoard(), 7)`. Replace with `bSwap(makeSolvedBoard(), 0, 1)`:

```ts
p2: { ...stub, board: bSlide(makeSolvedBoard(), 7) }
```

becomes:

```ts
p2: { ...stub, board: bSwap(makeSolvedBoard(), 0, 1) }
```

**6c. The "on timeout, higher correctCount wins" test (around line 131–144).** Replace:

```ts
const p1Board = bSlide(makeSolvedBoard(), 7);
const p2Board = bSlide(bSlide(makeSolvedBoard(), 7), 4);
```

with:

```ts
const p1Board = bSwap(makeSolvedBoard(), 0, 1); // 7 correct
const p2Board = bSwap(bSwap(makeSolvedBoard(), 0, 1), 2, 3); // 5 correct
```

**6d. The "pinching over slidable piece lifts it" test (lines 163–184) — rename for clarity and assert the new behavior.** Replace the entire `it(...)` block with:

```ts
it('pinching over any piece lifts it (no adjacency required)', () => {
  const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
  const s0: GameState = {
    phase: 'solve',
    remainingMs: 60000,
    startMs: 300_000,
    p1: { ...stub, board: makeSolvedBoard() },
    p2: { ...stub, board: makeSolvedBoard() }
  };
  // Pinch over cell 0 (top-left). Under the old slide rules, cell 0 was
  // NOT adjacent to the empty cell (which was at 8) so it could not be
  // lifted. Under the new rules, every piece is grabbable.
  const g: GestureSnapshot = {
    p1: {
      left: { present: true, pinch: 'holding', cursor: imageCursorOverCell(0, 'p1') },
      right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
    },
    p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
  };
  const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
  if (s.phase === 'solve') {
    expect(s.p1.board.heldBy).toBe('p1');
    expect(s.p1.board.heldPieceCell).toBe(0);
  }
});
```

**6e. The "releasing pinch over empty cell with adjacent held piece performs the slide" test (lines 186–214) — rename and assert swap.** Replace the entire `it(...)` block with:

```ts
it('releasing pinch over a different cell swaps the two pieces', () => {
  const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
  const board = makeSolvedBoard();
  // Player is holding the piece from cell 0 with cursor currently over cell 8.
  board.heldBy = 'p1';
  board.heldPieceCell = 0;
  board.heldCursor = boardLocalAtCell(8);

  const s0: GameState = {
    phase: 'solve',
    remainingMs: 60000,
    startMs: 300_000,
    p1: { ...stub, board },
    p2: { ...stub, board: makeSolvedBoard() }
  };
  // Hand is no longer holding (release).
  const g: GestureSnapshot = {
    p1: {
      left: { present: true, pinch: 'idle', cursor: imageCursorOverCell(8, 'p1') },
      right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
    },
    p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
  };
  const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
  if (s.phase === 'solve') {
    expect(s.p1.board.cells[0]).toBe(8);
    expect(s.p1.board.cells[8]).toBe(0);
    expect(s.p1.board.heldBy).toBeNull();
    expect(s.p1.board.heldPieceCell).toBe(-1);
    expect(s.p1.board.heldCursor).toBeNull();
  } else {
    throw new Error('expected solve phase');
  }
});
```

**6f. (Optional but recommended.) Add a third test covering the cancel-on-same-cell case.** After 6e, add:

```ts
it('releasing pinch back over the origin cell cancels (no swap)', () => {
  const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
  const board = makeSolvedBoard();
  board.heldBy = 'p1';
  board.heldPieceCell = 4;
  board.heldCursor = boardLocalAtCell(4); // hovering over origin

  const s0: GameState = {
    phase: 'solve',
    remainingMs: 60000,
    startMs: 300_000,
    p1: { ...stub, board },
    p2: { ...stub, board: makeSolvedBoard() }
  };
  const g: GestureSnapshot = {
    p1: {
      left: { present: true, pinch: 'idle', cursor: imageCursorOverCell(4, 'p1') },
      right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
    },
    p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
  };
  const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
  if (s.phase === 'solve') {
    // Board cells unchanged.
    expect(s.p1.board.cells).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    // Held state cleared.
    expect(s.p1.board.heldBy).toBeNull();
  }
});
```

- [ ] **Step 7: Update `src/lib/render/drawPuzzle.ts` — minimum changes to compile**

The existing `drawPuzzle.ts` references `board.emptyIndex` and `board.cells[i] === null`, both of which no longer exist. We make the smallest possible changes to get it compiling; the visual polish (origin placeholder, target glow) is Task 2.

Open `src/lib/render/drawPuzzle.ts`. Replace the entire body of `drawBoard()` with:

```ts
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  pieces: ImageBitmap[],
  area: Rect,
  highlightColor = '#ffd66b'
) {
  const cellW = area.w / 3;
  const cellH = area.h / 3;

  // Background plate
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(area.x - 8, area.y - 8, area.w + 16, area.h + 16);
  ctx.restore();

  for (let i = 0; i < 9; i++) {
    const id = board.cells[i];
    const c = i % 3;
    const r = Math.floor(i / 3);
    const x = area.x + c * cellW;
    const y = area.y + r * cellH;
    // The lifted piece is drawn on top at the cursor — skip its origin cell here.
    if (board.heldPieceCell === i && board.heldBy != null) continue;
    drawPiece(ctx, pieces[id], { x, y, w: cellW, h: cellH }, {
      isCorrect: id === i,
      highlightColor
    });
  }

  // Held piece on top, positioned at cursor
  if (board.heldBy && board.heldCursor) {
    const id = board.cells[board.heldPieceCell];
    if (id !== undefined) {
      const px = area.x + board.heldCursor.x * area.w - cellW / 2;
      const py = area.y + board.heldCursor.y * area.h - cellH / 2;
      ctx.save();
      ctx.shadowColor = highlightColor;
      ctx.shadowBlur = 30;
      drawPiece(ctx, pieces[id], { x: px, y: py, w: cellW * 1.08, h: cellH * 1.08 }, {
        isCorrect: false,
        highlightColor,
        lifted: true
      });
      ctx.restore();
    }
  }
}
```

Also update the `drawPiece` helper's `opts` parameter shape — remove `isSlidable` since the slidable highlight is gone. Replace:

```ts
function drawPiece(
  ctx: CanvasRenderingContext2D,
  bmp: ImageBitmap | undefined,
  rect: Rect,
  opts: { isCorrect: boolean; isSlidable: boolean; highlightColor: string; lifted?: boolean }
) {
```

with:

```ts
function drawPiece(
  ctx: CanvasRenderingContext2D,
  bmp: ImageBitmap | undefined,
  rect: Rect,
  opts: { isCorrect: boolean; highlightColor: string; lifted?: boolean }
) {
```

Then inside `drawPiece`, the body switches on `isCorrect` / `isSlidable` / else. Replace the border-drawing block (currently lines 105–119):

```ts
ctx.save();
if (opts.isCorrect) {
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 4;
} else if (opts.isSlidable) {
  ctx.strokeStyle = opts.highlightColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = opts.highlightColor;
  ctx.shadowBlur = 8;
} else {
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
}
ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
ctx.restore();
```

with:

```ts
ctx.save();
if (opts.isCorrect) {
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 4;
} else {
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
}
ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
ctx.restore();
```

(The lifted piece's outer glow halo comes from the `ctx.shadowBlur = 30` set up in the caller — no change needed there.)

- [ ] **Step 8: Run all tests**

```bash
npm test
```

Expected: All tests pass — the new `board.test.ts` (≈11 tests), updated `tick.test.ts` (≈12 tests including the new cancel case), plus all unrelated test files. Total: ~47+ passing.

If any test fails, do NOT commit. Fix the underlying issue and re-run.

- [ ] **Step 9: Run the type check**

```bash
npm run check
```

Expected: 0 errors. (The pre-existing `@types/node` warning is unrelated.)

- [ ] **Step 10: Verify the dev server boots**

```bash
npm run dev
```

Expected: starts cleanly. Visit `http://localhost:5173`, walk through to the solve phase if possible (camera required for full path; otherwise just confirm the splash + nicknames screens still load without console errors). Stop with Ctrl+C.

- [ ] **Step 11: Commit**

```bash
git add src/lib/game/board.ts src/lib/game/tick.ts src/lib/render/drawPuzzle.ts tests/unit/board.test.ts tests/unit/tick.test.ts
git commit -m "feat(game): drag-and-swap puzzle mechanic"
```

Use this commit message verbatim. After this commit the new mechanic works end-to-end; Task 2 adds the visual polish on top.

---

## Task 2: Visual polish in `drawPuzzle.ts` — origin placeholder + target glow

This task adds the two visual elements the spec calls out in Section 4: a dashed-outline placeholder on the origin cell of the held piece, and a colored glow on the cell the held piece is hovering over. The mechanic is already correct after Task 1 — this is pure feedback.

**Files:**
- Modify: `src/lib/render/drawPuzzle.ts`

- [ ] **Step 1: Add the origin placeholder + target glow rendering**

Open `src/lib/render/drawPuzzle.ts`. Inside `drawBoard()`, immediately after the background plate block and BEFORE the `for (let i = 0; i < 9; i++)` piece loop, insert:

```ts
  // Origin placeholder: when a piece is lifted, render a dashed outline on
  // the cell it came from so the player can see where to drop it back to
  // cancel.
  const heldOriginCell = board.heldBy != null ? board.heldPieceCell : -1;
  if (heldOriginCell >= 0) {
    const oc = heldOriginCell % 3;
    const or = Math.floor(heldOriginCell / 3);
    const ox = area.x + oc * cellW;
    const oy = area.y + or * cellH;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(ox + 4, oy + 4, cellW - 8, cellH - 8);
    ctx.restore();
  }

  // Target glow: while a piece is held, the cell the cursor is currently
  // over (if any, and different from origin) gets a bright glowing ring in
  // the player's tint — tells the player "release here to swap."
  let targetCell = -1;
  if (board.heldBy != null && board.heldCursor) {
    const tx = board.heldCursor.x;
    const ty = board.heldCursor.y;
    if (tx >= 0 && tx <= 1 && ty >= 0 && ty <= 1) {
      const tc = Math.max(0, Math.min(2, Math.floor(tx * 3)));
      const tr = Math.max(0, Math.min(2, Math.floor(ty * 3)));
      const idx = tr * 3 + tc;
      if (idx !== heldOriginCell) targetCell = idx;
    }
  }
```

Then inside the `for (let i = 0; i < 9; i++)` piece loop, before the existing `drawPiece(...)` call, add the target glow as an outer stroke:

```ts
    if (i === targetCell) {
      ctx.save();
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = highlightColor;
      ctx.shadowBlur = 18;
      ctx.strokeRect(x - 2, y - 2, cellW + 4, cellH + 4);
      ctx.restore();
    }
```

Place that block immediately after the `if (board.heldPieceCell === i && board.heldBy != null) continue;` line and before the `drawPiece(...)` call.

The full piece-loop body should now look like:

```ts
  for (let i = 0; i < 9; i++) {
    const id = board.cells[i];
    const c = i % 3;
    const r = Math.floor(i / 3);
    const x = area.x + c * cellW;
    const y = area.y + r * cellH;
    if (board.heldPieceCell === i && board.heldBy != null) continue;
    if (i === targetCell) {
      ctx.save();
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = highlightColor;
      ctx.shadowBlur = 18;
      ctx.strokeRect(x - 2, y - 2, cellW + 4, cellH + 4);
      ctx.restore();
    }
    drawPiece(ctx, pieces[id], { x, y, w: cellW, h: cellH }, {
      isCorrect: id === i,
      highlightColor
    });
  }
```

- [ ] **Step 2: Run the type check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Run the unit tests**

```bash
npm test
```

Expected: all tests still pass. No new tests are added in this task because `drawPuzzle.ts` is canvas rendering — its correctness is judged visually, not by unit tests.

- [ ] **Step 4: Verify the dev server boots**

```bash
npm run dev
```

Stop with Ctrl+C after confirming the server starts cleanly. Full visual verification (pinch a piece, drag, see origin dashed and target glowing) requires a camera and is the user's responsibility during a smoke pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/drawPuzzle.ts
git commit -m "feat(render): origin placeholder + target glow for held piece"
```

---

## Self-Review

**1. Spec coverage:**

- Board model (Section 1 of spec) — Task 1 Steps 1–4 (board.ts rewrite + tests).
- Scramble + win condition (Section 2) — Task 1 Steps 1, 3, 5c (scrambleSwap + correctCount === 9 check).
- Hold / release / swap logic (Section 3) — Task 1 Step 5b (applyPlayerHold replacement) + Step 6 (tick.test.ts).
- Rendering changes (Section 4) — Task 1 Step 7 (slidable highlight removal + minimum compile fix) and Task 2 (origin placeholder + target glow).
- Tests + file footprint (Section 5) — covered across both tasks.
- Non-goals (no swap animation, no multi-swap per pinch, no UI for difficulty) — implicitly respected: no animation code, single release commits a single swap, scramble has only the `minOutOfPlace` parameter.

No spec requirements are unaddressed.

**2. Placeholder scan:** No TBDs, no "fill in details", every step contains exact code or exact commands.

**3. Type consistency:**
- `Board.cells` is `PieceId[]` (non-null) in every reference.
- `Board.correctCount` is 0..9 in every reference.
- `swap(b, a, c)` signature is consistent in board.ts (Step 3), tick.ts (Step 5b uses `boardSwap`), and tick.test.ts (Step 6a uses `bSwap`).
- `scrambleSwap(rng, minOutOfPlace)` signature is consistent across Step 3 (definition) and Step 5c (call with defaults).
- Removed exports (`slide`, `isAdjacentToEmpty`, `scrambleByRandomMoves`, `Board.emptyIndex`) are not referenced anywhere after Task 1.
