# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Snap & Solve** — a 2-player, hand-tracked sliding-puzzle game for the SUTD AI student conference (NAISC). Two players stand at one laptop, frame a "snip" of the webcam feed using two-handed pinch gestures, then race to reassemble their snip as a 3×3 sliding puzzle using drag-and-swap pinch gestures.

Stack: **Svelte 5 + SvelteKit 2 + TypeScript + Tailwind v4 + anime.js v4 + MediaPipe Tasks Vision**

## Commands

```bash
npm run dev          # dev server at http://localhost:5173
npm run build        # production build
npm run preview      # preview production build at http://localhost:4173
npm run check        # svelte-kit sync + svelte-check type check
npm test             # vitest unit tests (pure logic only)
npm run test:watch   # vitest in watch mode
```

Run a single test file: `npx vitest run src/lib/game/board.test.ts`

Run smoke tests manually before committing to main — see `docs/smoke-test.md`.

## Architecture

### Data flow

```
webcam → MediaPipe → frameLoop → gesture layer → game tick → canvas render
                                                           ↓
                                                    Svelte UI overlay
```

**`src/lib/vision/`** — I/O layer. `webcam.ts` opens the camera, `mediapipe.ts` runs the Hand Landmarker WASM model, `oneEuro.ts` smooths landmark jitter. `frameLoop.ts` is the rAF loop: it detects hands, **mirrors x at source** (`x = 1 - lm.x`) so all downstream code operates in screen-space (left of screen = low x), applies One Euro filtering, assigns hands to players, and calls `onFrame`.

**`src/lib/gesture/`** — Pure hand-geometry functions. `assign.ts` splits detected hands into p1 (wristX < 0.5) and p2 (wristX ≥ 0.5). `pinch.ts` tracks a pinch state machine (idle → pinching → holding). `cursor.ts` derives the cursor point from the hand.

**`src/lib/game/`** — Pure game logic (no DOM, no side effects). `state.ts` defines the `GameState` discriminated union and all event/gesture types. `tick.ts` is the main reducer: `tick(state, event, gestures) → state`. `board.ts` manages the 3×3 `Board` (cells, correctCount, drag state). `snip.ts` handles rect geometry. `slicer.ts` cuts an `ImageBitmap` into 9 pieces. `history.ts` persists results to localStorage.

**`src/lib/render/`** — Canvas drawing functions. All drawing goes through `App.svelte`'s single `<canvas>` overlay. `drawPuzzle.ts` renders boards; `drawCursor.ts` renders per-player pointers; `drawSnipRect.ts` renders the framing overlay.

**`src/lib/ui/App.svelte`** — The root component. It owns the webcam/MediaPipe init lifecycle, the frame loop callback, snip capture (`maybeCaptureLockedSnips`), audio reactions, and the canvas draw call. All other UI components are stateless overlays that read from the global store.

**`src/lib/store.svelte.ts`** — Four Svelte 5 `$state` boxes: `game` (the full `GameState`), `muted`, `paused`, `leaderboard`. Updated directly from `App.svelte` on each tick.

### Game phases (state machine)

`splash → nicknames → trackingCheck → snip → countdown → solve → result`

- **trackingCheck**: waits for both players to show 2 hands for 2 s, then a 3 s auto-countdown.
- **snip**: each player holds both pinches for 1.5 s to lock a rect; once both are locked, snip capture fires.
- **countdown**: 5 s preview of captured snips; boards are scrambled as countdown ends.
- **solve**: drag-and-swap mechanic. `applyPlayerHold` in `tick.ts` tracks which piece is held and swaps on release. 5-minute timer; first to `correctCount === 9` wins.
- **result**: winner declared; rematch returns to `trackingCheck`, new players returns to `nicknames`.

### Key invariants

- **Mirroring happens once**, in `frameLoop.ts`. Snip capture in `App.svelte` un-mirrors back to video coords when reading pixels (`unmirror()` helper).
- **`tick()` is pure**. Never call side-effecting code (audio, canvas, IndexedDB) inside it.
- In solve phase, `App.svelte` collapses each player to a single hand (`pickSolveHand`) before passing gestures to `tick()` — gesture logic always uses the `left` slot.
- Leaderboard uses **IndexedDB** (`src/lib/db/leaderboard.ts`), not localStorage.
- Audio (`src/lib/audio/`) degrades gracefully — missing files are silently skipped.
