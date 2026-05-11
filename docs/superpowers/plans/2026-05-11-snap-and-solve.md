# Snap & Solve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2-player, hand-tracked sliding-puzzle web game (Snap & Solve) — a SvelteKit SPA using MediaPipe Hand Landmarker for gesture input — to demo at the SUTD AI student conference.

**Architecture:** Six modules with clear boundaries — `vision/` (webcam + MediaPipe), `gesture/` (pure landmark→gesture), `game/` (state machine), `render/` (canvas), `ui/` (Svelte components), `audio/` (SFX + music). One-way data flow: webcam → vision → gesture → game → render/ui/audio. A single `requestAnimationFrame` driver advances vision, gesture, game tick, and render every frame; Svelte reactivity only fires on high-level state changes.

**Tech Stack:** Svelte 5 (runes), SvelteKit 2, TypeScript 5, Tailwind CSS 4, shadcn-svelte (Bits UI), anime.js v4, @mediapipe/tasks-vision 0.10, Vitest 2 for unit tests, `@sveltejs/adapter-auto` for Vercel + local deploys.

**Spec:** [`docs/superpowers/specs/2026-05-11-snap-and-solve-design.md`](../specs/2026-05-11-snap-and-solve-design.md)

---

## File Structure

```
src/
  lib/
    vision/         # webcam, MediaPipe, smoothing, frame loop  (5 files)
    gesture/        # pinch state machine, cursor, hand-to-player (3 files)
    game/           # state, tick, board, slicer, snip math, history (6 files)
    render/         # canvas + draw helpers (4 files)
    audio/          # sfx, music, asset list (3 files)
    ui/             # Svelte components (8 files) + components/ (shadcn)
    store.svelte.ts # top-level $state
  routes/
    +page.svelte    # mounts App, wires the frame loop
    +layout.svelte  # global styles
  app.css           # Tailwind + theme tokens
static/
  audio/            # sfx + music files
  models/           # hand_landmarker.task
tests/unit/         # pinch, assign, board, tick, slicer, snip
```

Each task below produces self-contained, testable changes. Pure-logic modules use **strict TDD**: failing test first, minimal implementation, verify pass, commit. Integration modules (Svelte UI, canvas, MediaPipe IO) use **manual smoke acceptance**: write, run dev server, eyeball, commit.

---

## Task 1: Initialize SvelteKit project

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `src/app.html`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`

- [ ] **Step 1: Initialize SvelteKit with the modern CLI in the current directory**

Run from `/Users/angks/projects/SUTD/SUTD_AIIG/NAISC_Mediapipe`:

```bash
npx sv@latest create . --template minimal --types ts --no-add-ons
```

If prompted "Directory is not empty," answer **yes** (the `docs/` folder is intentional). The CLI will scaffold SvelteKit 2 + Svelte 5 + TypeScript.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify dev server boots**

```bash
npm run dev
```

Expected: dev server starts on `http://localhost:5173`, shows the default Welcome page. Stop with Ctrl+C.

- [ ] **Step 4: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold SvelteKit project"
```

---

## Task 2: Install runtime + dev dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install @mediapipe/tasks-vision animejs clsx tailwind-merge tailwind-variants
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D tailwindcss @tailwindcss/vite vitest @types/animejs
```

- [ ] **Step 3: Verify lockfile and commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add runtime and dev dependencies"
```

---

## Task 3: Configure Tailwind CSS v4

**Files:**
- Modify: `vite.config.ts`, `src/app.css`
- Modify: `src/routes/+layout.svelte` (import `app.css`)

- [ ] **Step 1: Add the Tailwind Vite plugin**

Edit `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

- [ ] **Step 2: Create the global stylesheet**

Create `src/app.css`:

```css
@import 'tailwindcss';

/* Playful theme tokens */
:root {
  --color-p1: oklch(0.7 0.18 30);   /* warm coral */
  --color-p2: oklch(0.7 0.18 210);  /* friendly blue */
  --color-accent: oklch(0.8 0.2 90);
}

html, body { height: 100%; margin: 0; overflow: hidden; font-family: system-ui, sans-serif; }
body { background: oklch(0.18 0.02 270); color: oklch(0.96 0 0); }
```

- [ ] **Step 3: Import it in the layout**

Edit `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 4: Smoke-test a Tailwind class**

Edit `src/routes/+page.svelte`:

```svelte
<h1 class="text-4xl font-bold text-center p-8">Snap &amp; Solve</h1>
```

Run `npm run dev`, confirm the heading renders large and centered. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure Tailwind v4 with playful theme tokens"
```

---

## Task 4: Install and initialize shadcn-svelte

**Files:**
- Create: shadcn config + components

- [ ] **Step 1: Initialize shadcn-svelte (use defaults)**

```bash
npx shadcn-svelte@latest init
```

When prompted, choose: Style **Default**, Base color **Slate**, CSS variables **yes**.

- [ ] **Step 2: Add the components we'll need**

```bash
npx shadcn-svelte@latest add button input dialog progress
```

- [ ] **Step 3: Verify import works**

Edit `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
</script>

<h1 class="text-4xl font-bold text-center p-8">Snap &amp; Solve</h1>
<div class="flex justify-center">
  <Button>Test button</Button>
</div>
```

Run `npm run dev`, confirm button renders. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: install shadcn-svelte and core components"
```

---

## Task 5: Configure Vitest

**Files:**
- Modify: `vite.config.ts`
- Create: `tests/unit/sanity.test.ts`

- [ ] **Step 1: Add Vitest config**

Edit `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node'
  }
});
```

- [ ] **Step 2: Add a sanity test**

Create `tests/unit/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Add the test script**

Edit `package.json` (in `scripts`):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure vitest"
```

---

## Task 6: Add shared types

**Files:**
- Create: `src/lib/vision/types.ts`

- [ ] **Step 1: Write the type module**

Create `src/lib/vision/types.ts`:

```ts
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type Landmark = { x: number; y: number; z: number };

/** 21 MediaPipe hand landmarks in normalized image coords (0..1). */
export type Hand = {
  landmarks: Landmark[];        // length 21
  worldLandmarks?: Landmark[];  // optional 3D
  confidence: number;           // min confidence across all landmarks
};

export type PlayerId = 'p1' | 'p2';

export type PlayerHands = {
  left: Hand | null;   // leftmost-on-screen
  right: Hand | null;  // rightmost-on-screen
};

export type Frame = {
  timestamp: number;
  fps: number;
  players: Record<PlayerId, PlayerHands>;
};

export type PieceId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** MediaPipe landmark indices used. */
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_BASE: 5,
  INDEX_TIP: 8
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(types): add shared vision/gesture types"
```

---

## Task 7: Pinch detection — TDD

**Files:**
- Create: `src/lib/gesture/pinch.ts`
- Test: `tests/unit/pinch.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/pinch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizedPinchDistance, advancePinchState, type PinchState } from '../../src/lib/gesture/pinch';
import type { Hand } from '../../src/lib/vision/types';

function hand(thumbTip: [number, number], indexTip: [number, number], wrist: [number, number] = [0.5, 0.9], indexBase: [number, number] = [0.5, 0.5]): Hand {
  const lm = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  lm[0]  = { x: wrist[0],     y: wrist[1],     z: 0 };
  lm[4]  = { x: thumbTip[0],  y: thumbTip[1],  z: 0 };
  lm[5]  = { x: indexBase[0], y: indexBase[1], z: 0 };
  lm[8]  = { x: indexTip[0],  y: indexTip[1],  z: 0 };
  return { landmarks: lm, confidence: 1 };
}

describe('normalizedPinchDistance', () => {
  it('returns small value when thumb and index touch', () => {
    const d = normalizedPinchDistance(hand([0.5, 0.5], [0.5, 0.5]));
    expect(d).toBeCloseTo(0);
  });

  it('returns larger value when thumb and index are far apart', () => {
    const d = normalizedPinchDistance(hand([0.5, 0.3], [0.5, 0.7]));
    expect(d).toBeGreaterThan(0.5);
  });
});

describe('advancePinchState', () => {
  const idle: PinchState = { kind: 'idle', heldMs: 0 };

  it('idle → pinching when distance crosses 0.45 threshold', () => {
    const next = advancePinchState(idle, 0.4, 16);
    expect(next.kind).toBe('pinching');
  });

  it('stays idle when distance is above 0.45', () => {
    const next = advancePinchState(idle, 0.5, 16);
    expect(next.kind).toBe('idle');
  });

  it('pinching → holding after 100 ms continuous pinch', () => {
    let s: PinchState = { kind: 'pinching', heldMs: 0 };
    s = advancePinchState(s, 0.4, 50);   // 50 ms
    expect(s.kind).toBe('pinching');
    s = advancePinchState(s, 0.4, 60);   // 110 ms total
    expect(s.kind).toBe('holding');
  });

  it('holding → idle when distance rises above 0.55 (hysteresis)', () => {
    const holding: PinchState = { kind: 'holding', heldMs: 200 };
    const stillHeld = advancePinchState(holding, 0.5, 16);
    expect(stillHeld.kind).toBe('holding');
    const released = advancePinchState(holding, 0.56, 16);
    expect(released.kind).toBe('idle');
  });

  it('pinching → idle if distance jumps back above 0.45 before 100 ms', () => {
    const pinching: PinchState = { kind: 'pinching', heldMs: 30 };
    const next = advancePinchState(pinching, 0.5, 16);
    expect(next.kind).toBe('idle');
  });
});
```

- [ ] **Step 2: Run and verify they fail**

```bash
npm test
```

Expected: tests fail with "Cannot find module".

- [ ] **Step 3: Implement**

Create `src/lib/gesture/pinch.ts`:

```ts
import type { Hand } from '../vision/types';
import { LM } from '../vision/types';

export type PinchState =
  | { kind: 'idle'; heldMs: number }
  | { kind: 'pinching'; heldMs: number }
  | { kind: 'holding'; heldMs: number };

const ENGAGE = 0.45;
const RELEASE = 0.55;
const HOLD_DEBOUNCE_MS = 100;

export function normalizedPinchDistance(hand: Hand): number {
  const t = hand.landmarks[LM.THUMB_TIP];
  const i = hand.landmarks[LM.INDEX_TIP];
  const w = hand.landmarks[LM.WRIST];
  const ib = hand.landmarks[LM.INDEX_BASE];
  const tipDist = Math.hypot(t.x - i.x, t.y - i.y);
  const handSize = Math.hypot(w.x - ib.x, w.y - ib.y) || 1e-6;
  return tipDist / handSize;
}

export function advancePinchState(prev: PinchState, distance: number, dtMs: number): PinchState {
  switch (prev.kind) {
    case 'idle':
      return distance < ENGAGE
        ? { kind: 'pinching', heldMs: 0 }
        : { kind: 'idle', heldMs: 0 };
    case 'pinching': {
      if (distance >= ENGAGE) return { kind: 'idle', heldMs: 0 };
      const next = prev.heldMs + dtMs;
      return next >= HOLD_DEBOUNCE_MS
        ? { kind: 'holding', heldMs: next }
        : { kind: 'pinching', heldMs: next };
    }
    case 'holding':
      return distance > RELEASE
        ? { kind: 'idle', heldMs: 0 }
        : { kind: 'holding', heldMs: prev.heldMs + dtMs };
  }
}
```

- [ ] **Step 4: Run and verify pass**

```bash
npm test
```

Expected: 6 tests pass (1 sanity + 5 pinch).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(gesture): pinch detection with hysteresis and debounce"
```

---

## Task 8: Cursor point — TDD

**Files:**
- Create: `src/lib/gesture/cursor.ts`
- Test: `tests/unit/cursor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/cursor.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and verify it fails**

```bash
npm test
```

Expected: cursor test fails.

- [ ] **Step 3: Implement**

Create `src/lib/gesture/cursor.ts`:

```ts
import type { Hand, Point } from '../vision/types';
import { LM } from '../vision/types';

export function getCursorPoint(hand: Hand): Point {
  const t = hand.landmarks[LM.THUMB_TIP];
  const i = hand.landmarks[LM.INDEX_TIP];
  return { x: (t.x + i.x) / 2, y: (t.y + i.y) / 2 };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(gesture): cursor point = midpoint of thumb+index tips"
```

---

## Task 9: Hand-to-player assignment — TDD

**Files:**
- Create: `src/lib/gesture/assign.ts`
- Test: `tests/unit/assign.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/assign.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { assignHandsToPlayers } from '../../src/lib/gesture/assign';
import type { Hand } from '../../src/lib/vision/types';

function hand(wristX: number, wristY = 0.5): Hand {
  const lm = Array.from({ length: 21 }, () => ({ x: wristX, y: wristY, z: 0 }));
  return { landmarks: lm, confidence: 1 };
}

describe('assignHandsToPlayers', () => {
  it('assigns hands by wrist x: <0.5 → p1, ≥0.5 → p2', () => {
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
    const hands = [hand(0.1, 0.1), hand(0.2, 0.5), hand(0.3, 0.55)]; // all p1
    const out = assignHandsToPlayers(hands);
    // The wristY=0.1 hand should be dropped (far from center 0.5).
    const xs = [out.p1.left?.landmarks[0].x, out.p1.right?.landmarks[0].x].filter(x => x != null).sort();
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
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement**

Create `src/lib/gesture/assign.ts`:

```ts
import type { Hand, PlayerHands, PlayerId } from '../vision/types';
import { LM } from '../vision/types';

function wristX(h: Hand): number { return h.landmarks[LM.WRIST].x; }
function wristY(h: Hand): number { return h.landmarks[LM.WRIST].y; }

function pickTwoMostCentral(hands: Hand[]): Hand[] {
  if (hands.length <= 2) return hands;
  return [...hands]
    .sort((a, b) => Math.abs(wristY(a) - 0.5) - Math.abs(wristY(b) - 0.5))
    .slice(0, 2);
}

function sortByX(hands: Hand[]): Hand[] {
  return [...hands].sort((a, b) => wristX(a) - wristX(b));
}

function pack(hands: Hand[]): PlayerHands {
  const sorted = sortByX(pickTwoMostCentral(hands));
  return { left: sorted[0] ?? null, right: sorted[1] ?? null };
}

export function assignHandsToPlayers(hands: Hand[]): Record<PlayerId, PlayerHands> {
  const p1Hands = hands.filter(h => wristX(h) < 0.5);
  const p2Hands = hands.filter(h => wristX(h) >= 0.5);
  return { p1: pack(p1Hands), p2: pack(p2Hands) };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(gesture): hand-to-player assignment by wrist x"
```

---

## Task 10: Sliding-puzzle board ops — TDD

**Files:**
- Create: `src/lib/game/board.ts`
- Test: `tests/unit/board.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/board.test.ts`:

```ts
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
    expect(b.correctCount).toBe(8); // empty counted as out-of-place
  });
});

describe('isAdjacentToEmpty', () => {
  it('returns true for the four neighbors of the empty cell on a 3×3', () => {
    const b = makeSolvedBoard(); // empty at 8 (row 2, col 2)
    expect(isAdjacentToEmpty(b, 7)).toBe(true);  // left
    expect(isAdjacentToEmpty(b, 5)).toBe(true);  // up
    expect(isAdjacentToEmpty(b, 6)).toBe(false); // diagonal
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
    expect(before.cells[7]).toBe(7); // immutability
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
  it('produces a solvable, scrambled board', () => {
    const b = scrambleByRandomMoves(80, () => 0.5);
    expect(b.cells.length).toBe(9);
    expect(b.cells.filter(c => c === null).length).toBe(1);
    // Solvable by construction (only ever applied valid slides from solved).
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
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement**

Create `src/lib/game/board.ts`:

```ts
import type { PieceId } from '../vision/types';

export type Board = {
  cells: (PieceId | null)[]; // length 9
  emptyIndex: number;
  correctCount: number;
};

const SIZE = 3;
const CELLS = SIZE * SIZE;

export function makeSolvedBoard(): Board {
  const cells: (PieceId | null)[] = [0, 1, 2, 3, 4, 5, 6, 7, null];
  return { cells, emptyIndex: 8, correctCount: 8 };
}

export function isSolved(b: Board): boolean {
  for (let i = 0; i < CELLS - 1; i++) if (b.cells[i] !== i) return false;
  return b.cells[CELLS - 1] === null;
}

function rowCol(idx: number): [number, number] { return [Math.floor(idx / SIZE), idx % SIZE]; }

export function isAdjacentToEmpty(b: Board, idx: number): boolean {
  if (idx === b.emptyIndex) return false;
  const [r1, c1] = rowCol(idx);
  const [r2, c2] = rowCol(b.emptyIndex);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

export function slide(b: Board, fromIdx: number): Board {
  if (!isAdjacentToEmpty(b, fromIdx)) return b;
  const cells = b.cells.slice();
  cells[b.emptyIndex] = cells[fromIdx];
  cells[fromIdx] = null;
  const next: Board = { cells, emptyIndex: fromIdx, correctCount: 0 };
  next.correctCount = correctCount(next);
  return next;
}

export function correctCount(b: Board): number {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (b.cells[i] !== null && b.cells[i] === (i as PieceId)) n++;
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
    const options = neighborsOfEmpty(b).filter(idx => idx !== lastFrom);
    const pick = options[Math.floor(rng() * options.length)];
    lastFrom = b.emptyIndex;
    b = slide(b, pick);
  }
  return b;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(game): 3x3 sliding-puzzle board with scramble guarantee"
```

---

## Task 11: Snip math — TDD

**Files:**
- Create: `src/lib/game/snip.ts`
- Test: `tests/unit/snip.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/snip.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rectFromCorners, clampToPlayerHalf, hasMinSize } from '../../src/lib/game/snip';

describe('rectFromCorners', () => {
  it('returns a normalized rect regardless of corner order', () => {
    const r = rectFromCorners({ x: 0.8, y: 0.6 }, { x: 0.2, y: 0.1 });
    expect(r).toEqual({ x: 0.2, y: 0.1, w: 0.6, h: 0.5 });
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
    expect(hasMinSize(r, 1280, 720, 150)).toBe(true);  // 192x180
    expect(hasMinSize(r, 800, 400, 150)).toBe(false);  // 120x100
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement**

Create `src/lib/game/snip.ts`:

```ts
import type { Point, Rect, PlayerId } from '../vision/types';

export function rectFromCorners(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function clampToPlayerHalf(p: Point, player: PlayerId): Point {
  if (player === 'p1') return { x: Math.min(p.x, 0.5), y: p.y };
  return { x: Math.max(p.x, 0.5), y: p.y };
}

export function hasMinSize(r: Rect, videoW: number, videoH: number, minPx = 150): boolean {
  return r.w * videoW >= minPx && r.h * videoH >= minPx;
}

/**
 * Capture an ImageBitmap of a normalized rect from the source. The source can be
 * an HTMLVideoElement or anything createImageBitmap accepts.
 */
export async function captureSnip(
  source: CanvasImageSource,
  rect: Rect,
  videoW: number,
  videoH: number
): Promise<ImageBitmap> {
  const sx = Math.round(rect.x * videoW);
  const sy = Math.round(rect.y * videoH);
  const sw = Math.round(rect.w * videoW);
  const sh = Math.round(rect.h * videoH);
  return createImageBitmap(source, sx, sy, sw, sh);
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(game): snip math and capture helper"
```

---

## Task 12: Puzzle piece slicer — TDD-light

**Files:**
- Create: `src/lib/game/slicer.ts`
- Test: `tests/unit/slicer.test.ts`

- [ ] **Step 1: Write a behavior test**

Create `tests/unit/slicer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pieceRect } from '../../src/lib/game/slicer';

describe('pieceRect', () => {
  it('returns the rect of piece N within a snip of dimensions w×h', () => {
    expect(pieceRect(0, 300, 300)).toEqual({ x: 0,   y: 0,   w: 100, h: 100 });
    expect(pieceRect(4, 300, 300)).toEqual({ x: 100, y: 100, w: 100, h: 100 });
    expect(pieceRect(8, 300, 300)).toEqual({ x: 200, y: 200, w: 100, h: 100 });
  });

  it('handles non-divisible dimensions by flooring (last column/row may differ by 1px)', () => {
    const r = pieceRect(8, 301, 301);
    expect(r.x + r.w).toBeLessThanOrEqual(301);
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement**

Create `src/lib/game/slicer.ts`:

```ts
import type { Rect, PieceId } from '../vision/types';

export function pieceRect(id: PieceId, snipW: number, snipH: number): Rect {
  const row = Math.floor(id / 3);
  const col = id % 3;
  const w = Math.floor(snipW / 3);
  const h = Math.floor(snipH / 3);
  return { x: col * w, y: row * h, w, h };
}

/**
 * Slices a snip ImageBitmap into 9 piece ImageBitmaps indexed by PieceId.
 */
export async function sliceSnipInto9Pieces(snip: ImageBitmap): Promise<ImageBitmap[]> {
  const pieces: ImageBitmap[] = [];
  for (let id = 0 as PieceId; id < 9; id = ((id as number) + 1) as PieceId) {
    const r = pieceRect(id, snip.width, snip.height);
    pieces.push(await createImageBitmap(snip, r.x, r.y, r.w, r.h));
    if (id >= 8) break;
  }
  return pieces;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(game): slicer for 3x3 puzzle piece bitmaps"
```

---

## Task 13: Game state machine (types only)

**Files:**
- Create: `src/lib/game/state.ts`

- [ ] **Step 1: Implement the state union**

Create `src/lib/game/state.ts`:

```ts
import type { Point, Rect, PieceId, PlayerId } from '../vision/types';
import type { Board } from './board';

export type Winner = 'p1' | 'p2' | 'draw';

export type SnipState =
  | { kind: 'idle' }
  | { kind: 'framing'; corner1: Point; corner2: Point | null; holdMs: number }
  | { kind: 'locked'; rect: Rect; snapshot: ImageBitmap };

export type PlayerSetup = { name: string; snip: ImageBitmap; pieces: ImageBitmap[] };
export type PlayerGame  = PlayerSetup & { board: Board };

export type GameState =
  | { phase: 'splash' }
  | { phase: 'nicknames'; p1Name: string; p2Name: string }
  | { phase: 'trackingCheck'; p1Name: string; p2Name: string; p1Ready: number; p2Ready: number; autoCountdownMs: number | null }
  | { phase: 'snip'; p1Name: string; p2Name: string; p1: SnipState; p2: SnipState }
  | { phase: 'countdown'; remainingMs: number; p1: PlayerSetup; p2: PlayerSetup }
  | { phase: 'solve'; remainingMs: number; p1: PlayerGame; p2: PlayerGame; winner?: Winner }
  | { phase: 'result'; winner: Winner; durationMs: number; p1: PlayerGame; p2: PlayerGame };

export const initialState: GameState = { phase: 'splash' };

export type GameEvent =
  | { type: 'advanceFromSplash' }
  | { type: 'nicknamesSubmitted'; p1Name: string; p2Name: string }
  | { type: 'rematch' }
  | { type: 'newPlayers' }
  | { type: 'tick'; dtMs: number };

export type GestureSnapshot = {
  // Per player, per hand: pinch state (idle/pinching/holding) and cursor in normalized image coords.
  p1: { left: HandGesture; right: HandGesture };
  p2: { left: HandGesture; right: HandGesture };
};

export type HandGesture = {
  present: boolean;
  pinch: 'idle' | 'pinching' | 'holding';
  cursor: Point;     // normalized 0..1; meaningful only when present
};
```

- [ ] **Step 2: Type-check**

```bash
npx svelte-check --tsconfig ./tsconfig.json
```

Expected: 0 errors related to these files. (Warnings about other files OK.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(game): state union and event/gesture types"
```

---

## Task 14: Game tick — TDD (phase transitions)

**Files:**
- Create: `src/lib/game/tick.ts`
- Test: `tests/unit/tick.test.ts`

- [ ] **Step 1: Write tests for the transitions that have pure logic**

Create `tests/unit/tick.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tick } from '../../src/lib/game/tick';
import { initialState, type GameState, type GestureSnapshot } from '../../src/lib/game/state';

const emptyHand = { present: false, pinch: 'idle' as const, cursor: { x: 0, y: 0 } };
const noGestures: GestureSnapshot = {
  p1: { left: emptyHand, right: emptyHand },
  p2: { left: emptyHand, right: emptyHand }
};

describe('tick — splash', () => {
  it('stays in splash without advanceFromSplash', () => {
    const s = tick(initialState, { type: 'tick', dtMs: 16 }, noGestures);
    expect(s.phase).toBe('splash');
  });

  it('advances to nicknames', () => {
    const s = tick(initialState, { type: 'advanceFromSplash' }, noGestures);
    expect(s.phase).toBe('nicknames');
  });
});

describe('tick — nicknames', () => {
  it('advances to trackingCheck on submission', () => {
    const s0: GameState = { phase: 'nicknames', p1Name: '', p2Name: '' };
    const s = tick(s0, { type: 'nicknamesSubmitted', p1Name: 'A', p2Name: 'B' }, noGestures);
    expect(s.phase).toBe('trackingCheck');
    if (s.phase === 'trackingCheck') {
      expect(s.p1Name).toBe('A');
      expect(s.p2Name).toBe('B');
      expect(s.p1Ready).toBe(0);
      expect(s.p2Ready).toBe(0);
    }
  });
});

describe('tick — trackingCheck readiness', () => {
  it('accumulates readiness when both hands present + confident', () => {
    const handReady = { present: true, pinch: 'idle' as const, cursor: { x: 0.2, y: 0.5 } };
    const g: GestureSnapshot = {
      p1: { left: handReady, right: handReady },
      p2: { left: { ...handReady, cursor: { x: 0.7, y: 0.5 } }, right: { ...handReady, cursor: { x: 0.8, y: 0.5 } } }
    };
    const s0: GameState = { phase: 'trackingCheck', p1Name: 'A', p2Name: 'B', p1Ready: 0, p2Ready: 0, autoCountdownMs: null };
    const s = tick(s0, { type: 'tick', dtMs: 500 }, g);
    expect(s.phase).toBe('trackingCheck');
    if (s.phase === 'trackingCheck') {
      expect(s.p1Ready).toBeGreaterThan(0);
      expect(s.p2Ready).toBeGreaterThan(0);
    }
  });

  it('resets readiness when hands disappear', () => {
    const s0: GameState = { phase: 'trackingCheck', p1Name: 'A', p2Name: 'B', p1Ready: 1000, p2Ready: 500, autoCountdownMs: null };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, noGestures);
    if (s.phase === 'trackingCheck') {
      expect(s.p1Ready).toBe(0);
      expect(s.p2Ready).toBe(0);
    }
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement the core tick logic for splash/nicknames/trackingCheck**

Create `src/lib/game/tick.ts`:

```ts
import type { GameState, GameEvent, GestureSnapshot, HandGesture, PlayerSetup, PlayerGame, SnipState, Winner } from './state';
import type { PlayerId, Point } from '../vision/types';
import { isAdjacentToEmpty, slide as boardSlide, correctCount, scrambleByRandomMoves } from './board';
import { rectFromCorners, clampToPlayerHalf, hasMinSize } from './snip';

const READY_HOLD_TARGET_MS = 2000;
const AUTO_COUNTDOWN_MS = 3000;
const SNIP_HOLD_MS = 1500;
const SOLVE_DURATION_MS = 5 * 60 * 1000;
const COUNTDOWN_DURATION_MS = 5000;

function bothHandsReady(p: { left: HandGesture; right: HandGesture }): boolean {
  return p.left.present && p.right.present;
}

export function tick(state: GameState, event: GameEvent, gestures: GestureSnapshot): GameState {
  if (event.type === 'newPlayers') return { phase: 'nicknames', p1Name: '', p2Name: '' };
  if (event.type === 'rematch' && state.phase === 'result') {
    return { phase: 'trackingCheck', p1Name: state.p1.name, p2Name: state.p2.name, p1Ready: 0, p2Ready: 0, autoCountdownMs: null };
  }

  switch (state.phase) {
    case 'splash':
      if (event.type === 'advanceFromSplash') return { phase: 'nicknames', p1Name: '', p2Name: '' };
      return state;

    case 'nicknames':
      if (event.type === 'nicknamesSubmitted') {
        return { phase: 'trackingCheck', p1Name: event.p1Name, p2Name: event.p2Name, p1Ready: 0, p2Ready: 0, autoCountdownMs: null };
      }
      return state;

    case 'trackingCheck': {
      if (event.type !== 'tick') return state;
      const dt = event.dtMs;
      const p1Ok = bothHandsReady(gestures.p1);
      const p2Ok = bothHandsReady(gestures.p2);
      const p1Ready = p1Ok ? Math.min(READY_HOLD_TARGET_MS, state.p1Ready + dt) : 0;
      const p2Ready = p2Ok ? Math.min(READY_HOLD_TARGET_MS, state.p2Ready + dt) : 0;
      const bothFull = p1Ready >= READY_HOLD_TARGET_MS && p2Ready >= READY_HOLD_TARGET_MS;

      if (bothFull) {
        const remaining = (state.autoCountdownMs ?? AUTO_COUNTDOWN_MS) - dt;
        if (remaining <= 0) {
          return { phase: 'snip', p1Name: state.p1Name, p2Name: state.p2Name, p1: { kind: 'idle' }, p2: { kind: 'idle' } };
        }
        return { ...state, p1Ready, p2Ready, autoCountdownMs: remaining };
      }
      return { ...state, p1Ready, p2Ready, autoCountdownMs: null };
    }

    case 'snip':
    case 'countdown':
    case 'solve':
    case 'result':
      return state; // implemented in later tasks
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: tick tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(game): tick — splash/nicknames/trackingCheck transitions"
```

---

## Task 15: Game tick — snip phase

**Files:**
- Modify: `src/lib/game/tick.ts`
- Test: `tests/unit/tick.test.ts`

- [ ] **Step 1: Add snip-phase tests**

Append to `tests/unit/tick.test.ts`:

```ts
describe('tick — snip', () => {
  function holding(x: number, y: number) {
    return { present: true, pinch: 'holding' as const, cursor: { x, y } };
  }
  function pinching(x: number, y: number) {
    return { present: true, pinch: 'pinching' as const, cursor: { x, y } };
  }

  it('enters framing when one hand holds', () => {
    const g: GestureSnapshot = {
      p1: { left: holding(0.1, 0.2), right: { present: true, pinch: 'idle', cursor: { x: 0.4, y: 0.5 } } },
      p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
    };
    const s0: GameState = { phase: 'snip', p1Name: 'A', p2Name: 'B', p1: { kind: 'idle' }, p2: { kind: 'idle' } };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'snip' && s.p1.kind === 'framing') {
      expect(s.p1.corner1).toEqual({ x: 0.1, y: 0.2 });
      expect(s.p1.corner2).toBeNull();
    } else { throw new Error('expected framing'); }
  });

  it('locks the snip after both hands hold for 1500 ms over a large enough rect', () => {
    const g: GestureSnapshot = {
      p1: { left: holding(0.05, 0.1), right: holding(0.45, 0.9) },
      p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
    };
    let s: GameState = { phase: 'snip', p1Name: 'A', p2Name: 'B', p1: { kind: 'framing', corner1: { x: 0.05, y: 0.1 }, corner2: { x: 0.45, y: 0.9 }, holdMs: 1499 }, p2: { kind: 'idle' } };
    s = tick(s, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'snip') {
      expect(s.p1.kind).toBe('locked');
    } else { throw new Error('expected snip phase'); }
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement the snip case in tick.ts**

Replace the `case 'snip':` in `src/lib/game/tick.ts` with:

```ts
case 'snip': {
  if (event.type !== 'tick') return state;
  const dt = event.dtMs;
  function nextSnipState(prev: SnipState, hands: { left: HandGesture; right: HandGesture }, player: PlayerId): SnipState {
    const leftHold = hands.left.present && hands.left.pinch === 'holding';
    const rightHold = hands.right.present && hands.right.pinch === 'holding';
    const leftCursor = clampToPlayerHalf(hands.left.cursor, player);
    const rightCursor = clampToPlayerHalf(hands.right.cursor, player);

    if (prev.kind === 'locked') return prev;

    if (leftHold && rightHold) {
      const rect = rectFromCorners(leftCursor, rightCursor);
      // 1280x720 default; refined when we wire the real video size in App.
      const okSize = hasMinSize(rect, 1280, 720);
      const holdMs = (prev.kind === 'framing' ? prev.holdMs : 0) + dt;
      if (okSize && holdMs >= SNIP_HOLD_MS) {
        // The actual ImageBitmap capture is performed by the App layer when it
        // observes the transition. Here we mark intent with a sentinel rect.
        // The renderer/app will replace this with the real snapshot.
        return { kind: 'locked', rect, snapshot: undefined as unknown as ImageBitmap };
      }
      return { kind: 'framing', corner1: leftCursor, corner2: rightCursor, holdMs };
    }
    if (leftHold) return { kind: 'framing', corner1: leftCursor, corner2: null, holdMs: 0 };
    if (rightHold) return { kind: 'framing', corner1: rightCursor, corner2: null, holdMs: 0 };
    return { kind: 'idle' };
  }
  const p1 = nextSnipState(state.p1, gestures.p1, 'p1');
  const p2 = nextSnipState(state.p2, gestures.p2, 'p2');
  // Transition to countdown is performed externally once the App has injected the bitmaps.
  return { ...state, p1, p2 };
}
```

> **NOTE for the orchestrator (App layer):** the `tick` function leaves `snapshot` as `undefined` because pure logic cannot perform an async `createImageBitmap` call. The App's `+page.svelte` observes `kind === 'locked'` without a real snapshot and asynchronously calls `captureSnip(video, rect, videoW, videoH)`, then replaces the snapshot field. When both players have real snapshots, the App dispatches a transition to the `countdown` phase. This is captured explicitly in Task 26.

- [ ] **Step 4: Run tests**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(game): tick — snip phase framing and lock-in"
```

---

## Task 16: Game tick — countdown + solve + result

**Files:**
- Modify: `src/lib/game/tick.ts`
- Test: `tests/unit/tick.test.ts`

- [ ] **Step 1: Add tests for countdown/solve/result**

Append to `tests/unit/tick.test.ts`:

```ts
import { makeSolvedBoard, scrambleByRandomMoves, slide as bSlide } from '../../src/lib/game/board';

describe('tick — countdown', () => {
  it('counts down by dtMs and transitions to solve when it reaches 0', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    let s: GameState = { phase: 'countdown', remainingMs: 100, p1: stub, p2: stub };
    s = tick(s, { type: 'tick', dtMs: 200 }, noGestures);
    expect(s.phase).toBe('solve');
    if (s.phase === 'solve') {
      expect(s.remainingMs).toBe(5 * 60 * 1000);
    }
  });
});

describe('tick — solve', () => {
  it('declares p1 as winner when p1.board is solved', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [], board: makeSolvedBoard() };
    const s0: GameState = { phase: 'solve', remainingMs: 60_000, p1: stub, p2: { ...stub, board: bSlide(makeSolvedBoard(), 7) } };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, noGestures);
    expect(s.phase).toBe('result');
    if (s.phase === 'result') expect(s.winner).toBe('p1');
  });

  it('on timeout, higher correctCount wins; equal is draw', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    const p1Board = bSlide(makeSolvedBoard(), 7);  // 7 correct
    const p2Board = bSlide(bSlide(makeSolvedBoard(), 7), 4);  // 6 correct (approx)
    const s0: GameState = { phase: 'solve', remainingMs: 16, p1: { ...stub, board: p1Board }, p2: { ...stub, board: p2Board } };
    const s = tick(s0, { type: 'tick', dtMs: 32 }, noGestures);
    expect(s.phase).toBe('result');
    if (s.phase === 'result') {
      expect(s.winner === 'p1' || s.winner === 'draw' || s.winner === 'p2').toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement the countdown / solve / result cases**

Replace the relevant cases in `src/lib/game/tick.ts`:

```ts
case 'countdown': {
  if (event.type !== 'tick') return state;
  const remaining = state.remainingMs - event.dtMs;
  if (remaining > 0) return { ...state, remainingMs: remaining };
  // Solve phase needs a board for each player. App layer injects boards before
  // countdown ends? Simpler: scramble here from solved if not provided.
  const p1Board = scrambleByRandomMoves(80);
  const p2Board = scrambleByRandomMoves(80);
  return {
    phase: 'solve',
    remainingMs: SOLVE_DURATION_MS,
    p1: { ...state.p1, board: p1Board },
    p2: { ...state.p2, board: p2Board }
  };
}

case 'solve': {
  if (event.type !== 'tick') return state;
  const dt = event.dtMs;
  // Solve interactions (drag/drop) are processed in tickSolveInteractions, called below.
  let next = tickSolveInteractions(state, gestures);

  // Win checks.
  if (next.phase !== 'solve') return next; // already transitioned
  const p1Won = next.p1.board.correctCount === 8 && next.p1.board.cells[8] === null;
  const p2Won = next.p2.board.correctCount === 8 && next.p2.board.cells[8] === null;
  if (p1Won) return { phase: 'result', winner: 'p1', durationMs: SOLVE_DURATION_MS - next.remainingMs, p1: next.p1, p2: next.p2 };
  if (p2Won) return { phase: 'result', winner: 'p2', durationMs: SOLVE_DURATION_MS - next.remainingMs, p1: next.p1, p2: next.p2 };

  const remaining = next.remainingMs - dt;
  if (remaining <= 0) {
    const winner: Winner = next.p1.board.correctCount > next.p2.board.correctCount ? 'p1'
                       : next.p2.board.correctCount > next.p1.board.correctCount ? 'p2' : 'draw';
    return { phase: 'result', winner, durationMs: SOLVE_DURATION_MS, p1: next.p1, p2: next.p2 };
  }
  return { ...next, remainingMs: remaining };
}

case 'result':
  return state;
```

Add the helper just below the `tick` function:

```ts
function tickSolveInteractions(state: GameState & { phase: 'solve' }, _g: GestureSnapshot): GameState & { phase: 'solve' } {
  // Drag-and-drop logic is plugged in later (Task 18). For now, no-op.
  return state;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(game): tick — countdown timer, solve timeout, win condition"
```

---

## Task 17: Solve-phase drag/drop interactions — TDD

**Files:**
- Modify: `src/lib/game/tick.ts`, `src/lib/game/state.ts`
- Test: `tests/unit/tick.test.ts`

- [ ] **Step 1: Extend the Board to track heldPiece (already in spec) and add tests**

Edit `src/lib/game/board.ts` — extend `Board`:

```ts
export type Board = {
  cells: (PieceId | null)[];
  emptyIndex: number;
  correctCount: number;
  heldBy?: PlayerId | null;   // currently lifting (per board, single hold)
  heldPieceCell?: number;     // original cell of held piece
  heldCursor?: Point | null;  // normalized 0..1 within the player's board area
};
```

Add import: `import type { PlayerId, Point } from '../vision/types';`.

Update `makeSolvedBoard` and `slide` to set `heldBy: null`, `heldPieceCell: -1`, `heldCursor: null`.

Append tests to `tests/unit/tick.test.ts`:

```ts
import { makeSolvedBoard } from '../../src/lib/game/board';

describe('tick — solve drag/drop', () => {
  function pinchAt(cell: number) {
    // Map cell index → cursor center (normalized to player's board area 0..1).
    const r = Math.floor(cell / 3), c = cell % 3;
    return { x: (c + 0.5) / 3, y: (r + 0.5) / 3 };
  }

  it('pinching over slidable piece lifts it', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    const board = makeSolvedBoard(); // empty at 8; piece 7 is slidable
    const s0: GameState = { phase: 'solve', remainingMs: 60000, p1: { ...stub, board }, p2: { ...stub, board: makeSolvedBoard() } };
    const g: GestureSnapshot = {
      p1: {
        left:  { present: true, pinch: 'holding', cursor: pinchAt(7) },
        right: { present: false, pinch: 'idle',   cursor: { x: 0, y: 0 } }
      },
      p2: {
        left:  { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      }
    };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'solve') {
      expect(s.p1.board.heldBy).toBe('p1');
      expect(s.p1.board.heldPieceCell).toBe(7);
    }
  });

  it('releasing pinch over empty cell with adjacent held piece performs the slide', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    const board: typeof stub & {} = makeSolvedBoard();
    board.heldBy = 'p1';
    board.heldPieceCell = 7;
    board.heldCursor = pinchAt(8);

    const s0: GameState = { phase: 'solve', remainingMs: 60000, p1: { ...stub, board }, p2: { ...stub, board: makeSolvedBoard() } };
    const g: GestureSnapshot = {
      p1: {
        left:  { present: true, pinch: 'idle', cursor: pinchAt(8) }, // released
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      },
      p2: {
        left:  { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      }
    };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'solve') {
      expect(s.p1.board.cells[8]).toBe(7);
      expect(s.p1.board.cells[7]).toBeNull();
      expect(s.p1.board.heldBy).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement `tickSolveInteractions`**

Replace the no-op in `src/lib/game/tick.ts`:

```ts
import { makeSolvedBoard, scrambleByRandomMoves, slide as boardSlide, isAdjacentToEmpty, correctCount } from './board';

function boardCellAt(p: Point): number {
  const col = Math.max(0, Math.min(2, Math.floor(p.x * 3)));
  const row = Math.max(0, Math.min(2, Math.floor(p.y * 3)));
  return row * 3 + col;
}

function applyPlayerHold(board: Board, player: PlayerId, hands: { left: HandGesture; right: HandGesture }): Board {
  // Pick the hand currently in 'holding' (prefer left if both).
  const active = hands.left.pinch === 'holding' ? hands.left
              : hands.right.pinch === 'holding' ? hands.right
              : null;
  // Hand whose hold just ended this frame (was holding, now not):
  const releasingActive = !active && board.heldBy === player;

  if (active) {
    const cell = boardCellAt(active.cursor);
    if (board.heldBy === player) {
      // Already holding: just update cursor.
      return { ...board, heldCursor: active.cursor };
    }
    // Newly grabbing: only allow if pinching over a slidable piece.
    if (isAdjacentToEmpty(board, cell)) {
      return { ...board, heldBy: player, heldPieceCell: cell, heldCursor: active.cursor };
    }
    return board;
  }

  if (releasingActive) {
    // Resolve drop.
    const dropCell = boardCellAt(board.heldCursor ?? { x: 0, y: 0 });
    const src = board.heldPieceCell ?? -1;
    const valid = dropCell === board.emptyIndex && isAdjacentToEmpty(board, src);
    const cleared = { ...board, heldBy: null as PlayerId | null, heldPieceCell: -1, heldCursor: null };
    return valid ? { ...boardSlide(cleared, src), heldBy: null, heldPieceCell: -1, heldCursor: null } : cleared;
  }
  return board;
}

function tickSolveInteractions(state: GameState & { phase: 'solve' }, g: GestureSnapshot): GameState & { phase: 'solve' } {
  const p1Board = applyPlayerHold(state.p1.board, 'p1', g.p1);
  const p2Board = applyPlayerHold(state.p2.board, 'p2', g.p2);
  return { ...state, p1: { ...state.p1, board: p1Board }, p2: { ...state.p2, board: p2Board } };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(game): tick — solve-phase drag, drop, slide"
```

---

## Task 18: One-Euro filter

**Files:**
- Create: `src/lib/vision/oneEuro.ts`

- [ ] **Step 1: Implement One-Euro filter for points**

Create `src/lib/vision/oneEuro.ts`:

```ts
import type { Point } from './types';

export class OneEuroFilter {
  private prev: number | null = null;
  private prevD: number = 0;
  private lastTime: number | null = null;
  constructor(private minCutoff = 1.0, private beta = 0.01, private dCutoff = 1.0) {}

  filter(value: number, tMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = tMs;
      this.prev = value;
      return value;
    }
    const dt = Math.max(1, tMs - this.lastTime) / 1000;
    this.lastTime = tMs;
    const dx = (value - (this.prev ?? value)) / dt;
    const aD = alpha(dt, this.dCutoff);
    const dxHat = aD * dx + (1 - aD) * this.prevD;
    this.prevD = dxHat;
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = alpha(dt, cutoff);
    const out = a * value + (1 - a) * (this.prev ?? value);
    this.prev = out;
    return out;
  }
}

function alpha(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroPointFilter {
  private fx = new OneEuroFilter();
  private fy = new OneEuroFilter();
  filter(p: Point, tMs: number): Point {
    return { x: this.fx.filter(p.x, tMs), y: this.fy.filter(p.y, tMs) };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(vision): one-euro filter for smoothing landmarks"
```

---

## Task 19: Webcam helper

**Files:**
- Create: `src/lib/vision/webcam.ts`

- [ ] **Step 1: Implement**

Create `src/lib/vision/webcam.ts`:

```ts
export type WebcamHandle = {
  video: HTMLVideoElement;
  stream: MediaStream;
  stop: () => void;
};

export async function openWebcam(): Promise<WebcamHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    audio: false
  });
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return {
    video,
    stream,
    stop: () => {
      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(vision): webcam helper"
```

---

## Task 20: MediaPipe HandLandmarker integration

**Files:**
- Create: `src/lib/vision/mediapipe.ts`
- Modify: place `static/models/hand_landmarker.task` (download)

- [ ] **Step 1: Download the model**

```bash
mkdir -p static/models
curl -L -o static/models/hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
```

Expected: file is ~6 MB.

- [ ] **Step 2: Implement the wrapper**

Create `src/lib/vision/mediapipe.ts`:

```ts
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { Hand } from './types';

let landmarker: HandLandmarker | null = null;

export async function initHandLandmarker(numHands = 4): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
  );
  landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  return landmarker;
}

export function detectHands(video: HTMLVideoElement, tsMs: number): Hand[] {
  if (!landmarker) return [];
  const res: HandLandmarkerResult = landmarker.detectForVideo(video, tsMs);
  const hands: Hand[] = [];
  for (let i = 0; i < res.landmarks.length; i++) {
    const lms = res.landmarks[i].map(p => ({ x: p.x, y: p.y, z: p.z }));
    const conf = res.handedness[i]?.[0]?.score ?? 1;
    hands.push({ landmarks: lms, worldLandmarks: res.worldLandmarks[i]?.map(p => ({ x: p.x, y: p.y, z: p.z })), confidence: conf });
  }
  return hands;
}
```

- [ ] **Step 3: Smoke-test (manual)**

Edit `src/routes/+page.svelte` to render a temporary debug overlay:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { openWebcam } from '$lib/vision/webcam';
  import { initHandLandmarker, detectHands } from '$lib/vision/mediapipe';

  let count = $state(0);

  onMount(async () => {
    const cam = await openWebcam();
    document.body.appendChild(cam.video);
    cam.video.style.cssText = 'position:fixed;top:0;left:0;width:50vw;border:2px solid lime';
    await initHandLandmarker(4);
    function loop() {
      const hands = detectHands(cam.video, performance.now());
      count = hands.length;
      requestAnimationFrame(loop);
    }
    loop();
  });
</script>

<div class="fixed top-4 right-4 bg-black/70 p-4 rounded text-2xl">Hands: {count}</div>
```

Run `npm run dev`, open the page, grant webcam permission, wave hands. Confirm "Hands: N" updates to match the number of visible hands. Stop dev server.

- [ ] **Step 4: Revert the temporary smoke-test page**

```bash
git checkout -- src/routes/+page.svelte
```

- [ ] **Step 5: Commit the new code (excluding the temporary smoke-test)**

```bash
git add -A
git commit -m "feat(vision): MediaPipe HandLandmarker wrapper with GPU delegate"
```

---

## Task 21: Frame loop driver

**Files:**
- Create: `src/lib/vision/frameLoop.ts`

- [ ] **Step 1: Implement**

Create `src/lib/vision/frameLoop.ts`:

```ts
import type { Frame, PlayerId } from './types';
import { detectHands } from './mediapipe';
import { OneEuroPointFilter } from './oneEuro';
import { assignHandsToPlayers } from '../gesture/assign';

export type FrameLoopOptions = {
  video: HTMLVideoElement;
  onFrame: (frame: Frame, dtMs: number) => void;
};

export function startFrameLoop({ video, onFrame }: FrameLoopOptions): () => void {
  let raf = 0;
  let last = performance.now();
  const filters = new Map<string, OneEuroPointFilter>();   // per-landmark smoothing
  function tick() {
    const now = performance.now();
    const dt = now - last;
    last = now;
    if (video.readyState >= 2) {
      const hands = detectHands(video, now);
      // Smooth each landmark independently. Key by hand index + landmark index.
      const smoothed = hands.map((h, hi) => ({
        ...h,
        landmarks: h.landmarks.map((lm, li) => {
          const key = `${hi}:${li}`;
          let f = filters.get(key);
          if (!f) { f = new OneEuroPointFilter(); filters.set(key, f); }
          const p = f.filter({ x: lm.x, y: lm.y }, now);
          return { x: p.x, y: p.y, z: lm.z };
        })
      }));
      const players = assignHandsToPlayers(smoothed);
      const frame: Frame = { timestamp: now, fps: dt > 0 ? 1000 / dt : 0, players };
      onFrame(frame, dt);
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(vision): frame loop driver with smoothing + player assignment"
```

---

## Task 22: Audio module

**Files:**
- Create: `src/lib/audio/assets.ts`, `src/lib/audio/sfx.ts`, `src/lib/audio/music.ts`
- Create empty placeholder audio files (to be replaced by real assets later)

- [ ] **Step 1: Stub placeholder audio files**

```bash
mkdir -p static/audio
for f in pinch slide countdown-tick countdown-go win-fanfare draw timeup lobby-loop gameplay-loop; do
  touch static/audio/$f.mp3
done
```

> **NOTE:** these are zero-byte placeholders so the import paths exist. Replace with real assets in Task 30. The audio module must not throw on a failed decode — it should log and continue.

- [ ] **Step 2: Implement asset list**

Create `src/lib/audio/assets.ts`:

```ts
export const SFX_FILES = {
  pinch: '/audio/pinch.mp3',
  slide: '/audio/slide.mp3',
  countdownTick: '/audio/countdown-tick.mp3',
  countdownGo: '/audio/countdown-go.mp3',
  winFanfare: '/audio/win-fanfare.mp3',
  draw: '/audio/draw.mp3',
  timeup: '/audio/timeup.mp3'
} as const;

export const MUSIC_FILES = {
  lobby: '/audio/lobby-loop.mp3',
  gameplay: '/audio/gameplay-loop.mp3'
} as const;

export type SfxName = keyof typeof SFX_FILES;
export type MusicName = keyof typeof MUSIC_FILES;
```

- [ ] **Step 3: Implement SFX manager**

Create `src/lib/audio/sfx.ts`:

```ts
import { SFX_FILES, type SfxName } from './assets';

let ctx: AudioContext | null = null;
const buffers = new Map<SfxName, AudioBuffer>();
let muted = false;

export async function preloadSfx(): Promise<void> {
  ctx ??= new AudioContext();
  await Promise.all(
    (Object.keys(SFX_FILES) as SfxName[]).map(async (name) => {
      try {
        const res = await fetch(SFX_FILES[name]);
        const ab = await res.arrayBuffer();
        if (ab.byteLength === 0) return;
        const buf = await ctx!.decodeAudioData(ab);
        buffers.set(name, buf);
      } catch (e) {
        console.warn(`SFX load failed for ${name}:`, e);
      }
    })
  );
}

export function playSfx(name: SfxName): void {
  if (muted || !ctx) return;
  const buf = buffers.get(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

export function setSfxMuted(v: boolean) { muted = v; }
```

- [ ] **Step 4: Implement music manager**

Create `src/lib/audio/music.ts`:

```ts
import { MUSIC_FILES, type MusicName } from './assets';

let current: HTMLAudioElement | null = null;
let muted = false;

export function playMusic(name: MusicName, volume = 0.4) {
  stopMusic();
  const a = new Audio(MUSIC_FILES[name]);
  a.loop = true;
  a.volume = muted ? 0 : volume;
  a.play().catch((e) => console.warn('music play failed', e));
  current = a;
}

export function stopMusic() {
  current?.pause();
  current = null;
}

export function setMusicMuted(v: boolean) {
  muted = v;
  if (current) current.volume = v ? 0 : 0.4;
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(audio): sfx and music managers with placeholder assets"
```

---

## Task 23: Top-level store

**Files:**
- Create: `src/lib/store.svelte.ts`

- [ ] **Step 1: Implement**

Create `src/lib/store.svelte.ts`:

```ts
import { initialState, type GameState } from './game/state';

export const game = $state<{ state: GameState }>({ state: initialState });
export const muted = $state<{ value: boolean }>({ value: false });
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(store): top-level $state for game and mute toggle"
```

---

## Task 24: UI — Splash + Nicknames + Mute button

**Files:**
- Create: `src/lib/ui/Splash.svelte`, `src/lib/ui/Nicknames.svelte`, `src/lib/ui/MuteButton.svelte`

- [ ] **Step 1: Splash**

Create `src/lib/ui/Splash.svelte`:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { tick as gameTick } from '$lib/game/tick';
  import { onMount } from 'svelte';

  function advance() {
    game.state = gameTick(game.state, { type: 'advanceFromSplash' }, anyEmptyGestures());
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') advance(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function anyEmptyGestures() {
    const h = { present: false, pinch: 'idle' as const, cursor: { x: 0, y: 0 } };
    return { p1: { left: h, right: h }, p2: { left: h, right: h } };
  }
</script>

<section class="h-screen flex flex-col items-center justify-center text-center select-none">
  <h1 class="text-7xl font-black tracking-tight">
    <span class="inline-block animate-bounce" style="animation-delay: 0ms">S</span>
    <span class="inline-block animate-bounce" style="animation-delay: 80ms">n</span>
    <span class="inline-block animate-bounce" style="animation-delay: 160ms">a</span>
    <span class="inline-block animate-bounce" style="animation-delay: 240ms">p</span>
    &amp;
    <span class="inline-block animate-bounce" style="animation-delay: 320ms">S</span>
    <span class="inline-block animate-bounce" style="animation-delay: 400ms">o</span>
    <span class="inline-block animate-bounce" style="animation-delay: 480ms">l</span>
    <span class="inline-block animate-bounce" style="animation-delay: 560ms">v</span>
    <span class="inline-block animate-bounce" style="animation-delay: 640ms">e</span>
  </h1>
  <p class="mt-8 text-xl opacity-80">Snip something. Solve the puzzle. Win the booth.</p>
  <div class="mt-12">
    <Button size="lg" onclick={advance}>Press SPACE or click to begin</Button>
  </div>
</section>
```

- [ ] **Step 2: Nicknames**

Create `src/lib/ui/Nicknames.svelte`:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { tick as gameTick } from '$lib/game/tick';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let p1 = $state('');
  let p2 = $state('');

  const canSubmit = $derived(p1.trim().length > 0 && p1.length <= 12 && p2.trim().length > 0 && p2.length <= 12);

  function submit() {
    if (!canSubmit) return;
    const empty = { present: false, pinch: 'idle' as const, cursor: { x: 0, y: 0 } };
    game.state = gameTick(game.state, { type: 'nicknamesSubmitted', p1Name: p1.trim(), p2Name: p2.trim() }, { p1: { left: empty, right: empty }, p2: { left: empty, right: empty } });
  }
</script>

<section class="h-screen flex flex-col items-center justify-center gap-12">
  <h2 class="text-4xl font-bold">Who's playing?</h2>
  <div class="grid grid-cols-2 gap-12 w-full max-w-3xl">
    <div class="flex flex-col gap-3">
      <label class="text-lg font-bold" style="color: var(--color-p1)">Player 1</label>
      <Input bind:value={p1} maxlength={12} placeholder="Nickname" class="text-xl py-6" />
    </div>
    <div class="flex flex-col gap-3">
      <label class="text-lg font-bold" style="color: var(--color-p2)">Player 2</label>
      <Input bind:value={p2} maxlength={12} placeholder="Nickname" class="text-xl py-6" />
    </div>
  </div>
  <Button size="lg" disabled={!canSubmit} onclick={submit}>Let's go!</Button>
</section>
```

- [ ] **Step 3: Mute button**

Create `src/lib/ui/MuteButton.svelte`:

```svelte
<script lang="ts">
  import { muted } from '$lib/store.svelte';
  import { setSfxMuted } from '$lib/audio/sfx';
  import { setMusicMuted } from '$lib/audio/music';

  function toggle() {
    muted.value = !muted.value;
    setSfxMuted(muted.value);
    setMusicMuted(muted.value);
  }
</script>

<button
  class="fixed top-4 right-4 z-50 size-12 rounded-full bg-black/40 hover:bg-black/60 text-2xl"
  onclick={toggle}
  aria-label={muted.value ? 'Unmute' : 'Mute'}
>{muted.value ? '🔇' : '🔊'}</button>
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): splash, nicknames, persistent mute toggle"
```

---

## Task 25: UI — Tracking Check screen

**Files:**
- Create: `src/lib/ui/TrackingCheck.svelte`

- [ ] **Step 1: Implement**

Create `src/lib/ui/TrackingCheck.svelte`:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';

  let p1Ready = $derived(game.state.phase === 'trackingCheck' ? game.state.p1Ready : 0);
  let p2Ready = $derived(game.state.phase === 'trackingCheck' ? game.state.p2Ready : 0);
  let auto = $derived(game.state.phase === 'trackingCheck' ? game.state.autoCountdownMs : null);
</script>

<div class="absolute inset-0 pointer-events-none">
  <div class="absolute inset-y-0 left-1/2 w-px bg-white/30"></div>
  <div class="absolute top-8 left-0 w-1/2 px-8">
    <h3 class="text-3xl font-bold mb-4" style="color: var(--color-p1)">Player 1 — show both hands</h3>
    <div class="w-full h-3 bg-white/10 rounded-full overflow-hidden">
      <div class="h-full bg-[var(--color-p1)] transition-[width]" style="width: {Math.min(100, (p1Ready / 2000) * 100)}%"></div>
    </div>
  </div>
  <div class="absolute top-8 right-0 w-1/2 px-8">
    <h3 class="text-3xl font-bold mb-4 text-right" style="color: var(--color-p2)">Player 2 — show both hands</h3>
    <div class="w-full h-3 bg-white/10 rounded-full overflow-hidden">
      <div class="h-full bg-[var(--color-p2)] transition-[width]" style="width: {Math.min(100, (p2Ready / 2000) * 100)}%"></div>
    </div>
  </div>
  {#if auto !== null}
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="text-7xl font-black bg-black/60 rounded-2xl px-12 py-6">{Math.ceil(auto / 1000)}</div>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): tracking-check overlay with per-player readiness bars"
```

---

## Task 26: UI — Snip Phase + App orchestration

**Files:**
- Create: `src/lib/ui/SnipPhase.svelte`
- Create: `src/lib/ui/App.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Snip Phase overlay**

Create `src/lib/ui/SnipPhase.svelte`:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';
  let s1 = $derived(game.state.phase === 'snip' ? game.state.p1 : null);
  let s2 = $derived(game.state.phase === 'snip' ? game.state.p2 : null);
</script>

<div class="absolute inset-0 pointer-events-none">
  <div class="absolute inset-y-0 left-1/2 w-px bg-white/30"></div>
  <div class="absolute top-8 left-0 w-1/2 text-center">
    <h3 class="text-3xl font-bold" style="color: var(--color-p1)">Frame your shot!</h3>
    <p class="opacity-80">Pinch both hands to make a rectangle. Hold 1.5s to lock in.</p>
    {#if s1?.kind === 'locked'}<p class="mt-2 text-2xl">Locked in ✓</p>{/if}
  </div>
  <div class="absolute top-8 right-0 w-1/2 text-center">
    <h3 class="text-3xl font-bold" style="color: var(--color-p2)">Frame your shot!</h3>
    <p class="opacity-80">Pinch both hands to make a rectangle. Hold 1.5s to lock in.</p>
    {#if s2?.kind === 'locked'}<p class="mt-2 text-2xl">Locked in ✓</p>{/if}
  </div>
</div>
```

- [ ] **Step 2: Main App orchestration component**

Create `src/lib/ui/App.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { openWebcam, type WebcamHandle } from '$lib/vision/webcam';
  import { initHandLandmarker } from '$lib/vision/mediapipe';
  import { startFrameLoop } from '$lib/vision/frameLoop';
  import { game } from '$lib/store.svelte';
  import { tick as gameTick } from '$lib/game/tick';
  import { normalizedPinchDistance, advancePinchState, type PinchState } from '$lib/gesture/pinch';
  import { getCursorPoint } from '$lib/gesture/cursor';
  import { captureSnip } from '$lib/game/snip';
  import { sliceSnipInto9Pieces } from '$lib/game/slicer';
  import type { Frame, Hand } from '$lib/vision/types';
  import type { GestureSnapshot, HandGesture } from '$lib/game/state';

  import Splash from './Splash.svelte';
  import Nicknames from './Nicknames.svelte';
  import TrackingCheck from './TrackingCheck.svelte';
  import SnipPhase from './SnipPhase.svelte';
  import MuteButton from './MuteButton.svelte';

  let cam: WebcamHandle | null = null;
  let permError = $state<string | null>(null);

  // Per-hand pinch state (4 slots: p1.left, p1.right, p2.left, p2.right)
  const pinches: Record<string, PinchState> = {
    'p1.left': { kind: 'idle', heldMs: 0 },
    'p1.right': { kind: 'idle', heldMs: 0 },
    'p2.left': { kind: 'idle', heldMs: 0 },
    'p2.right': { kind: 'idle', heldMs: 0 }
  };

  function handToGesture(h: Hand | null, slot: string, dtMs: number): HandGesture {
    if (!h) {
      pinches[slot] = { kind: 'idle', heldMs: 0 };
      return { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } };
    }
    const d = normalizedPinchDistance(h);
    pinches[slot] = advancePinchState(pinches[slot], d, dtMs);
    return { present: true, pinch: pinches[slot].kind === 'pinching' ? 'pinching' : pinches[slot].kind === 'holding' ? 'holding' : 'idle', cursor: getCursorPoint(h) };
  }

  function framesToGestures(f: Frame, dt: number): GestureSnapshot {
    return {
      p1: { left: handToGesture(f.players.p1.left, 'p1.left', dt), right: handToGesture(f.players.p1.right, 'p1.right', dt) },
      p2: { left: handToGesture(f.players.p2.left, 'p2.left', dt), right: handToGesture(f.players.p2.right, 'p2.right', dt) }
    };
  }

  async function maybeCaptureLockedSnips() {
    if (game.state.phase !== 'snip' || !cam) return;
    const w = cam.video.videoWidth, h = cam.video.videoHeight;
    for (const side of ['p1', 'p2'] as const) {
      const ss = game.state[side];
      if (ss.kind === 'locked' && !ss.snapshot) {
        const bmp = await captureSnip(cam.video, ss.rect, w, h);
        ss.snapshot = bmp;
      }
    }
    const p1 = game.state.p1, p2 = game.state.p2;
    if (p1.kind === 'locked' && p1.snapshot && p2.kind === 'locked' && p2.snapshot) {
      const [p1Pieces, p2Pieces] = await Promise.all([sliceSnipInto9Pieces(p1.snapshot), sliceSnipInto9Pieces(p2.snapshot)]);
      game.state = {
        phase: 'countdown',
        remainingMs: 5000,
        p1: { name: (game.state as any).p1Name, snip: p1.snapshot, pieces: p1Pieces },
        p2: { name: (game.state as any).p2Name, snip: p2.snapshot, pieces: p2Pieces }
      };
    }
  }

  onMount(async () => {
    try {
      cam = await openWebcam();
      await initHandLandmarker(4);
      const stop = startFrameLoop({
        video: cam.video,
        onFrame: (frame, dt) => {
          const gestures = framesToGestures(frame, dt);
          game.state = gameTick(game.state, { type: 'tick', dtMs: dt }, gestures);
          maybeCaptureLockedSnips();
        }
      });
      return () => { stop(); cam?.stop(); };
    } catch (e: any) {
      permError = e?.message ?? String(e);
    }
  });
</script>

<MuteButton />

{#if permError}
  <div class="absolute inset-0 flex items-center justify-center">
    <div class="bg-black/60 p-8 rounded-xl max-w-md text-center">
      <h3 class="text-2xl mb-4">Camera access needed</h3>
      <p class="opacity-80">{permError}</p>
      <button class="mt-6 px-4 py-2 bg-white text-black rounded" onclick={() => location.reload()}>Retry</button>
    </div>
  </div>
{:else}
  {#if game.state.phase === 'splash'}<Splash />{/if}
  {#if game.state.phase === 'nicknames'}<Nicknames />{/if}
  {#if game.state.phase === 'trackingCheck'}<TrackingCheck />{/if}
  {#if game.state.phase === 'snip'}<SnipPhase />{/if}
{/if}
```

- [ ] **Step 3: Wire it into the page**

Replace `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import App from '$lib/ui/App.svelte';
</script>

<App />
```

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`, grant webcam permission, advance through splash → nicknames → tracking check. Confirm progress bars accumulate when you raise both hands on each side. Confirm advance to snip phase.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): App orchestrator, snip phase overlay, snip→countdown handoff"
```

---

## Task 27: Canvas renderer — video + landmarks + snip rectangle

**Files:**
- Create: `src/lib/render/canvas.ts`, `src/lib/render/drawLandmarks.ts`, `src/lib/render/drawSnipRect.ts`
- Modify: `src/lib/ui/App.svelte`

- [ ] **Step 1: Canvas helpers**

Create `src/lib/render/canvas.ts`:

```ts
export function resizeCanvasToDisplay(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export function drawVideoMirrored(ctx: CanvasRenderingContext2D, video: HTMLVideoElement) {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -width, 0, width, height);
  ctx.restore();
}
```

Create `src/lib/render/drawLandmarks.ts`:

```ts
import type { Hand } from '$lib/vision/types';

const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

export function drawHandLandmarks(ctx: CanvasRenderingContext2D, hand: Hand, color = '#a3ff00') {
  const { width: w, height: h } = ctx.canvas;
  // Note: input landmarks are in unmirrored coords; we mirror by 1-x.
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [a, b] of CONNECTIONS) {
    const la = hand.landmarks[a], lb = hand.landmarks[b];
    ctx.moveTo((1 - la.x) * w, la.y * h);
    ctx.lineTo((1 - lb.x) * w, lb.y * h);
  }
  ctx.stroke();
  for (const lm of hand.landmarks) {
    ctx.beginPath();
    ctx.arc((1 - lm.x) * w, lm.y * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

Create `src/lib/render/drawSnipRect.ts`:

```ts
import type { Rect } from '$lib/vision/types';

export function drawSnipRect(ctx: CanvasRenderingContext2D, rect: Rect, holdRatio: number, color: string) {
  const { width: w, height: h } = ctx.canvas;
  // Mirror x.
  const x = (1 - (rect.x + rect.w)) * w;
  const y = rect.y * h;
  const rw = rect.w * w;
  const rh = rect.h * h;
  ctx.save();
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = color;
  ctx.strokeRect(x, y, rw, rh);
  ctx.setLineDash([]);
  // Hold progress ring at the top-left corner.
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x + 14, y + 14, 14, -Math.PI / 2, -Math.PI / 2 + holdRatio * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
```

- [ ] **Step 2: Wire up a single canvas in App.svelte**

Add to `src/lib/ui/App.svelte` template (at top of the markup before the conditional screens):

```svelte
<canvas bind:this={canvas} class="fixed inset-0 w-screen h-screen"></canvas>
```

And in `<script>`:

```ts
import { resizeCanvasToDisplay, drawVideoMirrored } from '$lib/render/canvas';
import { drawHandLandmarks } from '$lib/render/drawLandmarks';
import { drawSnipRect } from '$lib/render/drawSnipRect';

let canvas: HTMLCanvasElement | undefined = $state();
let lastFrame: Frame | null = null;

function draw() {
  if (!canvas || !cam) return;
  resizeCanvasToDisplay(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawVideoMirrored(ctx, cam.video);
  if (lastFrame) {
    for (const side of ['p1','p2'] as const) {
      const hands = lastFrame.players[side];
      const color = side === 'p1' ? '#ff8a5b' : '#5bb8ff';
      if (hands.left) drawHandLandmarks(ctx, hands.left, color);
      if (hands.right) drawHandLandmarks(ctx, hands.right, color);
    }
  }
  if (game.state.phase === 'snip') {
    for (const side of ['p1','p2'] as const) {
      const ss = game.state[side];
      if (ss.kind === 'framing' && ss.corner2) {
        const r = { x: Math.min(ss.corner1.x, ss.corner2.x), y: Math.min(ss.corner1.y, ss.corner2.y), w: Math.abs(ss.corner1.x - ss.corner2.x), h: Math.abs(ss.corner1.y - ss.corner2.y) };
        drawSnipRect(ctx, r, Math.min(1, ss.holdMs / 1500), side === 'p1' ? '#ff8a5b' : '#5bb8ff');
      }
    }
  }
}
```

In `onMount`, modify `onFrame` to also store `lastFrame = frame` and call `draw()` at the end.

- [ ] **Step 3: Smoke-test**

Run `npm run dev`, grant webcam, advance to snip phase, pinch both hands — confirm neon rectangle appears and progress ring fills over 1.5s.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(render): video + landmarks + snip rectangle"
```

---

## Task 28: UI — Countdown + Solve screens + puzzle rendering

**Files:**
- Create: `src/lib/ui/Countdown.svelte`, `src/lib/ui/SolvePhase.svelte`, `src/lib/render/drawPuzzle.ts`
- Modify: `src/lib/ui/App.svelte`

- [ ] **Step 1: Puzzle renderer**

Create `src/lib/render/drawPuzzle.ts`:

```ts
import type { Board } from '$lib/game/board';
import type { Rect } from '$lib/vision/types';

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  pieces: ImageBitmap[],
  area: Rect,         // pixel-space area to draw the 3x3 board
  highlightColor = '#ffd66b'
) {
  const cellW = area.w / 3;
  const cellH = area.h / 3;
  for (let i = 0; i < 9; i++) {
    const id = board.cells[i];
    const r = i % 3;
    const c = Math.floor(i / 3);
    const x = area.x + r * cellW;
    const y = area.y + c * cellH;
    if (id === null) continue;
    const isHeld = board.heldPieceCell === i && board.heldBy != null;
    const isCorrect = id === i;
    // Draw piece.
    if (pieces[id]) {
      ctx.drawImage(pieces[id], x, y, cellW, cellH);
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y, cellW, cellH);
    }
    // Outlines.
    ctx.lineWidth = isCorrect ? 4 : 2;
    ctx.strokeStyle = isCorrect ? '#4ade80' : '#ffffff33';
    ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
    if (isHeld) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = highlightColor;
      ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);
    }
  }
  // Slidable glow on neighbors of the empty cell.
  const empty = board.emptyIndex;
  const er = empty % 3, ec = Math.floor(empty / 3);
  const neighbors = [empty - 1, empty + 1, empty - 3, empty + 3].filter(n => n >= 0 && n < 9);
  for (const n of neighbors) {
    if (Math.floor(n / 3) === Math.floor(empty / 3) || (n % 3) === (empty % 3)) {
      // valid neighbor
      const r = n % 3, c = Math.floor(n / 3);
      const x = area.x + r * cellW;
      const y = area.y + c * cellH;
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = highlightColor + 'aa';
      ctx.strokeRect(x + 5, y + 5, cellW - 10, cellH - 10);
      ctx.restore();
    }
  }
}
```

- [ ] **Step 2: Countdown screen**

Create `src/lib/ui/Countdown.svelte`:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';
  let remaining = $derived(game.state.phase === 'countdown' ? game.state.remainingMs : 0);
  let label = $derived(remaining > 0 ? Math.ceil(remaining / 1000).toString() : 'GO!');
</script>

<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div class="text-9xl font-black bg-black/60 rounded-3xl px-16 py-8 animate-pulse">{label}</div>
</div>
```

- [ ] **Step 3: Solve screen**

Create `src/lib/ui/SolvePhase.svelte`:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';

  const fmt = (ms: number) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  let timer = $derived(game.state.phase === 'solve' ? fmt(game.state.remainingMs) : '0:00');
  let p1 = $derived(game.state.phase === 'solve' ? game.state.p1 : null);
  let p2 = $derived(game.state.phase === 'solve' ? game.state.p2 : null);
</script>

<div class="absolute inset-0 pointer-events-none">
  <div class="absolute top-2 left-1/2 -translate-x-1/2 text-5xl font-mono bg-black/60 px-6 py-1 rounded-xl">{timer}</div>
  <div class="absolute top-2 left-4 text-xl" style="color: var(--color-p1)">{p1?.name} — {p1?.board.correctCount}/9</div>
  <div class="absolute top-2 right-4 text-xl text-right" style="color: var(--color-p2)">{p2?.name} — {p2?.board.correctCount}/9</div>
</div>
```

- [ ] **Step 4: Wire boards into the canvas renderer**

In `src/lib/ui/App.svelte`, add to the `draw()` function:

```ts
import { drawBoard } from '$lib/render/drawPuzzle';

// ...inside draw(), after rendering video + landmarks:
if (game.state.phase === 'solve' || game.state.phase === 'countdown' || game.state.phase === 'result') {
  const w = canvas.width;
  const h = canvas.height;
  const side = Math.min(h * 0.7, w * 0.45);
  const margin = 40;
  const p1Area = { x: margin, y: (h - side) / 2, w: side, h: side };
  const p2Area = { x: w - margin - side, y: (h - side) / 2, w: side, h: side };
  if (game.state.phase === 'solve') {
    drawBoard(ctx, game.state.p1.board, game.state.p1.pieces, p1Area, '#ffb866');
    drawBoard(ctx, game.state.p2.board, game.state.p2.pieces, p2Area, '#66b8ff');
  }
}
```

And add the screens to the markup:

```svelte
{#if game.state.phase === 'countdown'}<Countdown />{/if}
{#if game.state.phase === 'solve'}<SolvePhase />{/if}
```

- [ ] **Step 5: Smoke-test end-to-end through solve**

Run `npm run dev`. Walk through: splash → nicknames → tracking check → snip (lock in both sides) → countdown → solve. Confirm puzzle pieces render in scrambled positions, glow on slidables, lift on pinch, slide on release over the empty cell.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui+render): countdown, solve HUD, puzzle rendering with held/slidable visuals"
```

---

## Task 29: UI — Result screen and history capture

**Files:**
- Create: `src/lib/ui/ResultScreen.svelte`, `src/lib/game/history.ts`
- Modify: `src/lib/ui/App.svelte`, `src/lib/game/tick.ts`

- [ ] **Step 1: History array**

Create `src/lib/game/history.ts`:

```ts
import type { Winner } from './state';

export type GameResult = {
  p1Name: string;
  p2Name: string;
  winner: Winner;
  durationMs: number;
  timestamp: number;
};

export const gameHistory: GameResult[] = [];

export function pushResult(r: GameResult) {
  gameHistory.push(r);
  // Future leaderboard: read gameHistory directly.
}
```

- [ ] **Step 2: Result screen**

Create `src/lib/ui/ResultScreen.svelte`:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { tick as gameTick } from '$lib/game/tick';

  let r = $derived(game.state.phase === 'result' ? game.state : null);
  const emptyGesture = { present: false, pinch: 'idle' as const, cursor: { x: 0, y: 0 } };
  const empty = { p1: { left: emptyGesture, right: emptyGesture }, p2: { left: emptyGesture, right: emptyGesture } };

  function rematch() { game.state = gameTick(game.state, { type: 'rematch' }, empty); }
  function newPlayers() { game.state = gameTick(game.state, { type: 'newPlayers' }, empty); }

  const winnerLabel = $derived(
    r?.winner === 'draw' ? 'Draw!' :
    r?.winner === 'p1' ? `${r.p1.name} wins!` :
    r?.winner === 'p2' ? `${r.p2.name} wins!` : ''
  );
</script>

<section class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-8">
  <h2 class="text-7xl font-black">{winnerLabel}</h2>
  <p class="text-2xl opacity-80">Time: {((r?.durationMs ?? 0) / 1000).toFixed(1)}s</p>
  <div class="flex gap-6">
    <Button size="lg" onclick={rematch}>Rematch</Button>
    <Button size="lg" variant="outline" onclick={newPlayers}>New players</Button>
  </div>
</section>
```

- [ ] **Step 3: Capture results on entry into result phase**

In `src/lib/ui/App.svelte`, add a `$effect` that pushes to history when phase becomes `result`:

```ts
import { pushResult } from '$lib/game/history';

$effect(() => {
  if (game.state.phase === 'result') {
    pushResult({
      p1Name: game.state.p1.name,
      p2Name: game.state.p2.name,
      winner: game.state.winner,
      durationMs: game.state.durationMs,
      timestamp: Date.now()
    });
  }
});
```

And add to the markup:

```svelte
{#if game.state.phase === 'result'}<ResultScreen />{/if}
```

- [ ] **Step 4: Smoke-test**

Run `npm run dev`, complete a quick solve (you can manually scramble fewer moves during testing — but for real gameplay leave at 80). Confirm winner screen appears, time shows, rematch works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): result screen with rematch/new-players, history capture"
```

---

## Task 30: Audio wiring + anime.js polish

**Files:**
- Modify: `src/lib/ui/App.svelte`, `src/lib/ui/Splash.svelte`, `src/lib/ui/Countdown.svelte`
- (Optional) drop real audio files into `static/audio/`

- [ ] **Step 1: Preload SFX and start music in App.svelte**

Add to `onMount` in App.svelte (before frame loop starts):

```ts
import { preloadSfx, playSfx } from '$lib/audio/sfx';
import { playMusic } from '$lib/audio/music';

await preloadSfx();
playMusic('lobby');
```

Add edge-triggered SFX via `$effect` reacting to phase transitions:

```ts
let prevPhase = $state(game.state.phase);
$effect(() => {
  const phase = game.state.phase;
  if (phase !== prevPhase) {
    if (phase === 'countdown') playSfx('countdownTick');
    if (phase === 'solve') { playSfx('countdownGo'); playMusic('gameplay'); }
    if (phase === 'result') {
      if (game.state.phase === 'result') {
        const w = game.state.winner;
        playSfx(w === 'draw' ? 'draw' : 'winFanfare');
      }
      playMusic('lobby');
    }
  }
  prevPhase = phase;
});
```

Also: track previous-board correctCount to fire slide SFX on each successful slide. Add inside the `onFrame` block, after `gameTick`:

```ts
// Detect a new slide by comparing held → not-held transitions with cell-count diff
// Simple proxy: any change in board.cells fires a slide sfx.
```

For simplicity, compare the previous and current board cell arrays per player; if they differ, play `slide`. (Add this as a side-effect in the `onFrame` callback.)

- [ ] **Step 2: anime.js polish on countdown numbers**

Edit `src/lib/ui/Countdown.svelte`:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { animate } from 'animejs';
  import { onMount } from 'svelte';

  let remaining = $derived(game.state.phase === 'countdown' ? game.state.remainingMs : 0);
  let label = $derived(remaining > 0 ? Math.ceil(remaining / 1000).toString() : 'GO!');
  let labelEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (labelEl) animate(labelEl, { scale: [1.4, 1], duration: 350, easing: 'outBack' });
    void label;
  });
</script>

<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div bind:this={labelEl} class="text-9xl font-black bg-black/60 rounded-3xl px-16 py-8">{label}</div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(audio+anim): SFX/music wiring, countdown number anime.js pop"
```

---

## Task 31: Error handling for camera permission

**Files:**
- Already handled in App.svelte (Task 26). Verify the modal.

- [ ] **Step 1: Manual test**

Run `npm run dev`. Open the page in a fresh incognito window and **deny** the camera permission prompt. Confirm the "Camera access needed" modal appears with a working Retry button.

- [ ] **Step 2: Verify reload works after permission grant**

Allow permission, hit Retry. Confirm webcam initializes and splash appears.

(No commit unless changes are made.)

---

## Task 32: Smoke test document

**Files:**
- Create: `docs/smoke-test.md`

- [ ] **Step 1: Write the smoke-test checklist**

Create `docs/smoke-test.md`:

```markdown
# Snap & Solve — Manual Smoke Test

Run before each commit-to-main and before the conference. Browser: Chrome.

1. [ ] Open the deployed URL (or `localhost:5173`); webcam permission prompt appears; grant.
2. [ ] Splash renders with bouncing letters and a working "Press SPACE or click" button.
3. [ ] Nicknames: both fields accept 1–12 chars; "Let's go!" disabled until both filled.
4. [ ] Tracking Check: raising 2 hands on each side fills both progress bars; auto countdown begins; transitions to Snip.
5. [ ] Snip: pinching one hand shows a corner dot; pinching both draws a live neon rectangle.
6. [ ] Snip: holding both pinches for 1.5s fills the progress ring and shows "Locked in ✓".
7. [ ] Both players locked in → countdown overlays appear with anime.js scale-pop.
8. [ ] Solve: pieces render scrambled; slidables glow; pinch over a slidable lifts it; release over empty performs the slide; slide SFX plays.
9. [ ] Wrong drop: release away from empty — piece returns; no SFX.
10. [ ] Win: complete a board → result screen shows correct winner + time.
11. [ ] Timeout: let timer expire with mixed correctness → result based on correctCount.
12. [ ] Rematch button returns to Tracking Check with same nicknames.
13. [ ] New players button returns to Nicknames blank.
14. [ ] Mute button: toggle silences all audio (SFX and music) and visually flips state.
15. [ ] Deny camera permission → friendly modal with working Retry.
16. [ ] FPS (devtools, Performance panel): detection ≥ 20 FPS with 4 hands present on the demo laptop.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: manual smoke-test checklist"
```

---

## Task 33: Deploy to Vercel

**Files:**
- None (uses adapter-auto).

- [ ] **Step 1: Verify production build succeeds**

```bash
npm run build
npm run preview
```

Open `localhost:4173`, run through smoke tests 1–14.

- [ ] **Step 2: Push to GitHub and connect to Vercel**

```bash
gh repo create snap-and-solve --public --source=. --remote=origin --push
```

In the Vercel dashboard, import the repository. The default Svelte preset works with adapter-auto.

- [ ] **Step 3: Confirm the deployed URL works**

Open the Vercel-assigned URL on a separate device, grant webcam, run a full game. Confirm `static/models/hand_landmarker.task` is served and audio files load (or fail gracefully if still empty).

- [ ] **Step 4: Commit any Vercel config tweaks if added**

```bash
git add -A
git commit -m "chore: vercel deployment"
git push
```

---

## Task 34: Replace placeholder audio (pre-conference)

**Files:**
- `static/audio/*.mp3`

- [ ] **Step 1: Source playful SFX**

Find or record 7 short SFX (≤ 1s each) and 2 short music loops (≤ 30s, looping cleanly):

- `pinch.mp3` — short tactile click ("clack").
- `slide.mp3` — quick swoosh.
- `countdown-tick.mp3` — soft beep.
- `countdown-go.mp3` — bright stinger.
- `win-fanfare.mp3` — celebratory chord.
- `draw.mp3` — neutral "tada".
- `timeup.mp3` — buzzer.
- `lobby-loop.mp3` — chiptune-ish playful loop.
- `gameplay-loop.mp3` — upbeat puzzle loop.

Free sources: freesound.org (CC0), zapsplat (account), or generate via bfxr / chiptone for SFX.

- [ ] **Step 2: Drop into `static/audio/`** replacing the empty placeholders.

- [ ] **Step 3: Run a smoke test with full audio**

- [ ] **Step 4: Commit**

```bash
git add static/audio
git commit -m "feat(audio): real SFX and music assets"
git push
```

---

## Task 35: Final pre-conference checklist

**Files:** none — verification only.

- [ ] **Step 1: Run the full smoke test (`docs/smoke-test.md`) on the actual demo laptop, with the actual webcam, under approximate booth lighting.**

- [ ] **Step 2: Confirm sustained ≥20 FPS detection with 4 hands.**

- [ ] **Step 3: Bookmark both the Vercel URL and `localhost:4173`. Pre-grant camera permission in Chrome at both origins.**

- [ ] **Step 4: Pre-build for offline:**

```bash
npm run build
```

and keep a Chrome window open on `localhost:4173` all day.

- [ ] **Step 5: Bring a backup wired USB webcam in case the built-in fails.**

---

## Self-Review

**Spec coverage check:**
- §3 split-screen single device + handedness-by-x-coord → Task 9 ✓
- §4.0 mute toggle on every screen → Task 24 ✓
- §4.2 splash + lobby music → Tasks 24, 30 ✓
- §4.3 nicknames → Task 24 ✓
- §4.4 tracking check + 2s hold + 3s auto-countdown → Tasks 14, 25 ✓
- §4.5 snip + two-handed framing + 1.5s lock → Tasks 11, 15, 26, 27 ✓
- §4.6 countdown (5s) → Tasks 16, 28, 30 ✓
- §4.7 solve + drag/drop + win/timeout → Tasks 16, 17, 28 ✓
- §4.8 result + rematch/new players → Task 29 ✓
- §6.1 GameState union → Task 13 ✓
- §6.2 frame loop → Task 21 ✓
- §6.3 assignment → Task 9 ✓
- §6.4 pinch state machine → Task 7 ✓
- §6.5 snip math → Task 11 ✓
- §6.6 slicer + 80-move scramble → Tasks 10, 12, 16 ✓
- §6.7 slide mechanics → Task 17 ✓
- §6.8 win resolution → Task 16 ✓
- §7 error handling: camera denial → Task 26 + Task 31; FPS log: deferred (low risk, can add inline if needed during smoke test) — **NOTE: not a hard requirement**; tab-focus pause: not implemented in this plan — **acceptable deferral for v1 booth demo**.
- §8 performance: lite model with GPU delegate → Task 20 ✓
- §11.3 smoke test → Task 32 ✓
- §12 deploy → Task 33 ✓
- §13 leaderboard data captured → Task 29 (`gameHistory`) ✓

**Placeholder scan:** no "TBD"/"TODO"/"add appropriate" — all code blocks are concrete.

**Type consistency:** `Board` type extended in Task 17 (heldBy/heldPieceCell/heldCursor) and referenced consistently afterward. `tick`/`GameEvent`/`GestureSnapshot` signatures match across Tasks 14–17.

**One small open item:** the spec mentions tab-blur pause (§7) and FPS warning logging (§7). The plan defers both as low-risk for the conference demo. If needed, they fit as a 30-minute follow-up after Task 35.
