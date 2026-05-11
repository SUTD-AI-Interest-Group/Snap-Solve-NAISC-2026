# Drag-and-swap puzzle mechanic

Date: 2026-05-11
Status: Approved (pending spec review)

## Goal

Replace the 8-piece-plus-one-hole sliding mechanic with a 9-piece drag-and-swap mechanic. The player pinches and holds any piece on their board, drags it over a different piece, releases, and the two pieces swap. The "empty slot" is removed entirely. Win = all 9 pieces in their solved positions.

## Non-goals

- Animation between cells during the swap.
- Multi-swap per pinch (one pinch → one swap → release required).
- Undo, hint system, auto-solve.
- UI for tuning scramble difficulty.
- Updates to `docs/smoke-test.md` (deferred to a separate follow-up).

## New board model

`src/lib/game/board.ts`:

```ts
export type Board = {
  cells: PieceId[];          // 9 slots, all non-null, a permutation of 0..8
  correctCount: number;       // 0..9
  heldBy: PlayerId | null;
  heldPieceCell: number;      // -1 if nothing held
  heldCursor: Point | null;
};
```

Removed from the type: `emptyIndex`, and the `| null` branch on `cells`.
Removed exports: `isAdjacentToEmpty`, `slide`, `scrambleByRandomMoves`, and any helper that depended on the empty slot (e.g. `neighborsOfEmpty`).

Invariant: `cells` is always a permutation of `[0..8]`. Every piece is exactly somewhere.

## Scramble + win condition

### Scramble

New exported function in `board.ts`:

```ts
export function scrambleSwap(
  rng: () => number = Math.random,
  minOutOfPlace = 7
): Board;
```

Behavior:
- Generates a random permutation of `[0..8]` via Fisher-Yates.
- Rejects and re-rolls any permutation where fewer than `minOutOfPlace` pieces are out of their solved position. Default 7 of 9 displaced ensures a meaningful starting puzzle.
- Returns a `Board` with that permutation, `correctCount` recomputed, and all held-state fields cleared.

Solvability is never a concern: every permutation of 9 elements is reachable by swaps, unlike the 15-puzzle's reachability constraint.

### Win condition

In `tick.ts`, solve phase:

```ts
// Before:
const p1Won = p1Board.correctCount === 8 && p1Board.cells[8] === null;

// After:
const p1Won = p1Board.correctCount === 9;
```

`correctCount` semantics expand from `0..8` to `0..9` — the null check is gone.

Tie-break (timer expiry, neither solved): unchanged — whoever has more correct cells wins, equal counts is a draw.

## Hold / release / swap logic

Replaces `applyPlayerHold()` in `src/lib/game/tick.ts`.

### State machine per player

```
                    pinch+over-own-cell
   ┌────────────┐ ──────────────────────► ┌──────────────────────────────┐
   │   IDLE     │                          │   HOLDING piece P (origin O)  │
   │ heldBy=null│ ◄──────────────────────  │ heldCursor follows hand       │
   └────────────┘   release / piece P      └──────────────────────────────┘
        ▲           returns to origin O           │
        │                                          │ release
        │                                          ▼
        │     ┌─────────────────────────────────────────────────────────┐
        │     │ Inspect cursor's current cell C at release moment:      │
        │     │   • C === O          → no-op (returned to origin)        │
        │     │   • C is valid cell  → swap pieces in cells O and C      │
        │     │   • C invalid        │
        │     │     (outside board / │
        │     │      other player)   → no-op (cancel, piece returns)     │
        └─────┴─────────────────────────────────────────────────────────┘
```

### Replacement function

```ts
function applyPlayerHold(
  board: Board,
  player: PlayerId,
  hands: { left: HandGesture; right: HandGesture }
): Board {
  const active = hands.left.pinch === 'holding' ? hands.left
               : hands.right.pinch === 'holding' ? hands.right
               : null;

  if (active) {
    const local = cursorToBoardLocal(active.cursor, player);
    const cell  = boardCellAt(local);
    if (board.heldBy === player) {
      // Already holding — keep following the cursor.
      return { ...board, heldCursor: local };
    }
    if (cell >= 0) {
      // Pick up the piece at this cell. No adjacency check.
      return { ...board, heldBy: player, heldPieceCell: cell, heldCursor: local };
    }
    return board;
  }

  // Released.
  if (board.heldBy === player) {
    const origin   = board.heldPieceCell;
    const dropCell = boardCellAt(board.heldCursor ?? { x: -1, y: -1 });
    const valid    = dropCell >= 0 && dropCell !== origin;
    return valid
      ? swap(board, origin, dropCell)
      : { ...board, heldBy: null, heldPieceCell: -1, heldCursor: null };
  }
  return board;
}
```

### `swap` helper

New pure helper in `board.ts`:

```ts
export function swap(b: Board, a: number, c: number): Board;
```

- If `a === c`: returns `b` unchanged (or a cleared-held-state equivalent).
- Otherwise: produces a new board with `cells[a]` and `cells[c]` exchanged, recomputes `correctCount`, clears `heldBy`/`heldPieceCell`/`heldCursor`.

### Key behavior differences from the sliding mechanic

- No `isAdjacentToEmpty` gate on pickup — every piece is grabbable.
- One pinch ≤ one swap. The swap only commits on release.
- Dropping outside the board, on the other player's board, or back on the same cell = cancel. The held piece returns to its origin and the player must pinch again to try.

## Rendering changes in `drawPuzzle.ts`

The current `drawBoard()` does three things that need to change.

### 1. Drop the "slidable" highlight ring

Delete the `neighborCells` computation (currently lines 21–29) and the `isSlidable` branch inside `drawPiece`. Every piece is now grabbable, so highlighting only neighbors of the empty cell is meaningless and misleading.

### 2. Render the held piece's origin cell as a dashed-outline placeholder

Reuse the existing empty-cell visual (the dashed rectangle currently drawn when `cells[i] === null`). Flip the trigger condition:

```ts
// Before: render dashed outline if cells[i] === null
// After:  render dashed outline if board.heldPieceCell === i  (piece is lifted from here)
```

The piece itself is drawn floating with the cursor on top, exactly as today.

### 3. Add a target-cell glow on the hover cell

New visual: when `heldBy !== null` and the held piece's `heldCursor` resolves to a valid cell that is not the origin, that cell gets a bright glowing ring (the active player's tint — `CANVAS_COLORS.p1Board` or `p2Board`) plus a subtle scale-up of the piece visible inside it. This tells the player "release now to swap with this piece."

### Visuals that stay the same

- Background plate behind the board.
- Per-piece rounded-rect clip with the image.
- Green "correct position" border (`#4ade80`) on cells where `cells[i] === i`.
- Held piece drawn last, at the cursor position, with a glow halo and slight scale-up.

## Files affected

| File | Change |
|---|---|
| `src/lib/game/board.ts` | Rewritten. New `Board` type, `makeSolvedBoard`, `correctCount`, `isSolved`, `swap`, `scrambleSwap`. Deletes `isAdjacentToEmpty`, `slide`, `scrambleByRandomMoves`, `neighborsOfEmpty`. |
| `src/lib/game/tick.ts` | `applyPlayerHold` replaced per the State Machine section. Win conditions updated. Scramble call swapped to `scrambleSwap`. |
| `src/lib/render/drawPuzzle.ts` | Slidable highlight removed; origin placeholder + target glow added per Rendering section. |
| `tests/unit/board.test.ts` | Full rewrite. Tests for `makeSolvedBoard`, `swap`, `correctCount`, `isSolved`, `scrambleSwap`. |
| `tests/unit/tick.test.ts` | Targeted edits to solve-phase tests that asserted slide / empty-index behavior. Non-solve phase tests unaffected. |

## Files NOT affected

- `src/lib/game/state.ts` — imports `Board` from `board.ts`, doesn't redefine it.
- `src/lib/game/slicer.ts`, `snip.ts`, `history.ts` — pure helpers, no dependency on the board model.
- `src/lib/ui/App.svelte` — calls `drawBoard()` opaquely; no behavior change at the call site.
- `src/lib/vision/*`, `src/lib/gesture/*`, audio modules — unaffected.

## Risks and gotchas

- `correctCount === 9` win triggers immediately when the swap that places the final piece commits. The `scrambleSwap(minOutOfPlace=7)` floor guarantees this can't happen at tick 1.
- The held-piece state lives in `Board` itself (`heldBy`, `heldPieceCell`, `heldCursor`). Drag-and-swap doesn't change the held-state shape — only the pickup gate (no adjacency check) and the release commit logic (swap instead of slide).
- Tie-break logic (timer expiry, who has more correct) is unchanged. `correctCount` semantics simply expand to 0..9.
- The new scramble's reject-and-reroll loop is bounded — the probability of a random permutation having ≥7 pieces displaced is high, so the average loop is well under 2 iterations.

## Open questions resolved during brainstorming

| Decision | Choice |
|---|---|
| Empty slot kept or removed? | Removed. 9 pieces always visible. |
| Real-time swap vs release-to-commit? | Release-to-commit. One pinch ≤ one swap. |
| Drop outside board or on same cell? | Cancel. Piece returns to origin. |
| Target highlight while dragging? | Origin shows dashed placeholder; target cell glows. No correctness preview. |
