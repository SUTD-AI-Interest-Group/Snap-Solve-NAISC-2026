# Snap & Solve — Design Spec

**Date:** 2026-05-11
**Author:** Brainstorming session (Ang Kah Shin + Claude)
**Event context:** NAISC — National AI Student Conference, SUTD, Singapore
**Status:** Design approved, ready for implementation planning

---

## 1. Product overview

**Snap & Solve** is a 2-player, 1-versus-1, hand-tracked puzzle game designed as an interactive demo for a conference booth. Two players stand side-by-side at one laptop equipped with a single webcam. Using only their hands — tracked in real time by MediaPipe — they each "snip" a region of their side of the camera view, then race to reassemble that snip as a 3×3 sliding puzzle. The first to solve wins; if neither solves in 5 minutes, the player with more correctly-placed pieces wins.

The game is designed to:

- **Draw a crowd** — visible, kinetic, with playful audio cues that travel across a noisy conference floor.
- **Onboard quickly** — minimal text, gesture-driven, with an automatic tracking-quality check before play.
- **Run reliably** — purely client-side, deployable to Vercel and runnable on `localhost` as a WiFi-failure fallback.

## 2. Goals and non-goals

### Goals

1. A playable end-to-end game from splash to result in under 7 minutes total (per match).
2. Hand-tracking reliable enough that 80% of players succeed at both the snip and at least one slide on their first attempt.
3. A "wow" moment in the snip phase: two-handed framing that reads to a watching crowd as obviously "AI-powered."
4. Smooth performance: ≥20 FPS hand detection with 4 simultaneous hands on a 2022+ laptop.
5. Stack and code organization that a single developer can build to a demo-ready state in roughly a week of focused work.

### Non-goals (deferred)

- Leaderboard **UI** (the in-memory data array is captured, but no leaderboard screen ships in v1).
- Persistent storage (no localStorage, no backend, no DB).
- Networked multiplayer.
- Mobile / tablet support.
- Difficulty levels beyond 3×3.
- Internationalization.
- Accessibility for one-handed players. The game is gesture-required by design.

## 3. Players, devices, and physical setup

- **Players:** exactly 2, standing side-by-side, facing the laptop.
- **Device:** one laptop with a built-in or USB webcam, modern desktop browser (Chrome / Edge / Safari). 1280×720 video preferred.
- **Screen:** split vertically down the middle. Left half = Player 1, right half = Player 2. No physical divider between players; the camera sees both at once.
- **Hand assignment:** by horizontal position of each hand's wrist. MediaPipe's `handedness` field is **not** trusted (it gets confused when players mirror each other).

## 4. Game flow

### 4.0 Persistent UI

A small **mute toggle** lives in the top-right corner on every screen. Toggles both SFX and music. State persists across the session (in-memory, not localStorage). Default: unmuted.

### 4.1 Phase sequence

```
Splash → Nicknames → Tracking Check → Snip → Countdown → Solve → Result
                                                                   ↓
                                                  ┌────────────────┤
                                                  ↓                ↓
                                              Rematch         New players
                                          (→ Tracking Check)  (→ Nicknames)
```

### 4.2 Splash

- Game title with playful bouncing-letter intro animation (anime.js).
- Pulsing pinch-icon and a hint: "Press SPACE or click to begin."
- Lobby music starts here.
- **Trigger out:** any keypress or click.

### 4.3 Nicknames

- Two large text inputs side by side (Player 1, Player 2). Each input is colored to match its side.
- Validation: 1–12 characters, no empty values, no profanity filter (booth-monitored).
- One "Let's go!" button below.
- **Trigger out:** button click.

### 4.4 Tracking Check

Pre-game gate that prevents starting with bad lighting or out-of-frame players.

- Full-width live webcam, mirrored, with hand landmarks drawn in neon for every detected hand.
- A vertical divider line down the middle.
- Each side shows a 3-item checklist:
  1. **Two hands detected** on this player's side.
  2. **Landmarks confident** (every landmark on every detected hand has confidence > 0.8).
  3. **Hold steady for 2 seconds.**
- When all three items are green for both players, a 3-second auto-countdown starts ("Get ready in 3…2…1…") and the game advances.
- If conditions break mid-check (a hand drops out, lighting dips), the affected player's checklist resets.
- **No timeout.** Players have all the time they need.

### 4.5 Snip phase

- Webcam feed continues full-width, mirrored, with the vertical divider.
- Each side shows the player's nickname and a "Frame your shot!" prompt.
- **Mechanic:** two-handed framing. With one hand pinched, a corner dot appears at the pinch midpoint. With both hands pinched on the same side, a live rectangle stretches between the two pinch midpoints.
- **Confirm:** both hands held in continuous pinch for **1500 ms** locks in the snip for that player. A circular progress ring grows around each pinch point during the hold.
- **Cancel:** releasing either pinch before 1500 ms cancels the in-progress snip with no penalty.
- **Constraints:**
  - Rectangle must be at least **150×150 video pixels**. The confirm ring will not fill below this size.
  - Pinch midpoints are clamped to the player's half of the video (x ∈ [0, 0.5] for P1, [0.5, 1.0] for P2).
- **On lock-in:** that player's side dims slightly and shows "Locked in! ✓". They wait for the other player.
- **Trigger out:** both players locked in.

### 4.6 Countdown

- Webcam feed slides up to a smaller header strip.
- Both 3×3 puzzle boards appear, pre-scrambled, with pieces visually frozen.
- A giant centered overlay counts "5 → 4 → 3 → 2 → 1 → GO!" with anime.js scale-bounce on each tick.
- Audio: countdown beep on each tick, "GO" stinger on zero, lobby music ducks.
- **Trigger out:** "GO!" — timer starts at 5:00.

### 4.7 Solve

Each side independently shows:

- **Top:** nickname, a small live webcam preview (~120×90 px) so the player can see their own hands, and a "**N/9 correct**" counter.
- **Center:** the 3×3 puzzle board, **8 pieces + 1 empty cell**.
- **Slidable pieces** (the up-to-4 neighbors of the empty cell) **glow** softly.
- **Pickup:** when the player pinches over a slidable piece, that piece "lifts" (scales ~1.1×, drop shadow) and follows the pinch midpoint.
- **Drop:**
  - Pinch released over the empty cell **AND** the held piece is adjacent to the empty cell in the current board state → piece slides into the empty cell, empty cell moves to the piece's former position. Slide SFX plays.
  - Pinch released anywhere else → piece snaps back to its original cell. No SFX, no penalty.
- **Pinch loss mid-drag** (hand leaves frame, fingers separate inadvertently) → piece snaps back.
- Only **one piece per player** can be held at a time.
- **Top-center**, spanning both sides: a large **MM:SS** timer counting down from 5:00.
- **End conditions** (whichever fires first):
  - A player's `correctCount === 9` → that player wins.
  - Timer reaches 0:00 → compare `correctCount`; higher wins, equal is a draw.

### 4.8 Result

- Winner's nickname rendered very large with a confetti burst (anime.js).
- A "winner" badge or "draw" banner.
- Side-by-side reveal for each player: their **original snip** next to their **final board state**, with correct/incorrect pieces highlighted.
- Time taken (or "Time's up!" for the timeout case).
- Two buttons:
  - **Rematch (same nicknames)** → returns to Tracking Check.
  - **New players** → returns to Nicknames.
- Win fanfare or draw jingle plays; lobby music resumes.
- The completed game is pushed onto `gameHistory` for future leaderboard use.

## 5. System architecture

A SvelteKit SPA running entirely in the browser. No backend, no database, no network calls at runtime (after the initial asset load). Deployable to Vercel via `adapter-auto` and runnable on `localhost` from the same build.

### 5.1 Module boundaries

Six logical modules, each with one responsibility:

1. **`vision/`** — webcam stream, MediaPipe HandLandmarker instance, per-frame detection loop, One-Euro smoothing. Outputs a structured `Frame` object per tick. Knows nothing about the game.
2. **`gesture/`** — pure functions turning landmarks into high-level gestures (`detectPinch`, `pinchState` with hysteresis, `getCursorPoint`, `assignHandsToPlayers`). Knows nothing about the game.
3. **`game/`** — the finite state machine for the entire game. Owns timer, boards, scores, win condition. Pure logic, no DOM, no canvas.
4. **`render/`** — canvas drawing for video, landmark overlays, snip rectangles, puzzle pieces, drag ghosts. Reads from `game/` state.
5. **`ui/`** — Svelte components for splash, nicknames, HUDs, result. Reactive to `game/` state. Does not touch the canvas or webcam directly.
6. **`audio/`** — SFX (Web Audio API) and music loop (HTMLAudioElement) manager. Edge-triggered from state transitions.

### 5.2 Data flow (one direction)

```
webcam → vision → gesture → game (state mutations)
                              ↓
                          render (reads state) → canvas
                              ↓
                          ui (reads state) → DOM
                              ↓
                          audio (reacts to state edges) → speakers
```

`render` and `gesture` run inside a single `requestAnimationFrame` driver. Svelte reactivity is only used for high-level phase / score / timer changes, never 30× per second.

## 6. Core mechanics and algorithms

### 6.1 Game state

A single discriminated union, mutated in place inside Svelte `$state`:

```ts
type GameState =
  | { phase: 'splash' }
  | { phase: 'nicknames'; p1Name: string; p2Name: string }
  | { phase: 'trackingCheck'; p1Ready: number; p2Ready: number /* hold-time ms */ }
  | { phase: 'snip'; p1Name: string; p2Name: string; p1: SnipState; p2: SnipState }
  | { phase: 'countdown'; remainingMs: number; p1: PlayerSetup; p2: PlayerSetup }
  | { phase: 'solve'; remainingMs: number; p1: PlayerGame; p2: PlayerGame; winner?: Winner }
  | { phase: 'result'; winner: Winner; durationMs: number; p1: PlayerGame; p2: PlayerGame }

type SnipState =
  | { kind: 'idle' }
  | { kind: 'framing'; corner1: Point; corner2: Point | null; holdMs: number }
  | { kind: 'locked'; rect: Rect; snapshot: ImageBitmap }

type PlayerSetup = { name: string; snip: ImageBitmap; pieces: PieceImage[] }
type PlayerGame  = PlayerSetup & { board: Board }
type Board = {
  cells: (PieceId | null)[]      // length 9, exactly one null
  emptyIndex: number
  heldPiece: { id: PieceId; cursor: Point } | null
  correctCount: number
}
type Winner = 'p1' | 'p2' | 'draw'
```

State transitions are driven by `tick(state, frame, dt) → state`, a pure function called every animation frame.

### 6.2 Frame loop

```
requestAnimationFrame loop {
  videoTexture := webcamFrame()
  landmarks    := mediapipe.detectForVideo(video, timestamp)   // 5–20 ms
  smoothed     := oneEuro.filter(landmarks)
  assignment   := assignHandsToPlayers(smoothed)
  gestures     := interpretGestures(prevGestures, assignment)
  state        := game.tick(state, gestures, dt)
  render.draw(state, videoTexture, smoothed)
  audio.react(prevState, state)
}
```

### 6.3 Hand-to-player assignment

```
function assignHandsToPlayers(hands) {
  // Per hand, take wrist x (landmark 0).
  // wrist.x < 0.5 → Player 1; wrist.x ≥ 0.5 → Player 2.
  // If a player has > 2 hands assigned, keep the 2 closest to vertical center.
  // Within each player, sort by x ascending: index 0 = "left" on screen, index 1 = "right".
}
```

This is the canonical source of truth for which hand belongs to which player. MediaPipe's own `handedness` field is ignored.

### 6.4 Pinch detection (per hand)

Normalized pinch distance:

```
d = distance(thumbTip, indexTip) / distance(wrist, indexBase)
```

State machine, per hand:

```
idle      → pinching   when d < 0.45
pinching  → holding    after 100 ms continuously pinching
holding   → idle       when d > 0.55
```

The 0.45 / 0.55 hysteresis band prevents jitter. The 100 ms debounce filters accidental brushes. `getCursorPoint(hand)` returns the midpoint of thumb tip and index tip.

### 6.5 Snipping math

For a player whose both hands are in `holding`:

1. Get pinch midpoint per hand.
2. Clamp x to the player's half ([0, 0.5] or [0.5, 1.0]).
3. Form a rectangle with `{x: min, y: min, w: |Δx|, h: |Δy|}`.
4. If both hands held continuously for **1500 ms** **and** w ≥ 150 px **and** h ≥ 150 px, lock in.
5. Capture: `createImageBitmap(videoElement, rect.x, rect.y, rect.w, rect.h)` on the **unmirrored** video frame. Store as `ImageBitmap`.

### 6.6 Puzzle piece slicing

After both snips locked, before countdown:

- For each player's snip `ImageBitmap`:
  - Divide into a 3×3 grid via 9 calls to `createImageBitmap(snip, x, y, w/3, h/3)`.
  - Assign each cell a `PieceId` 0–8 by its solved position.
  - **Piece 8 (bottom-right)** is the empty cell by convention.
  - Apply **80 random valid slide moves** from the solved state to scramble. Guarantees solvability and is well above the ~60-move full-mixing threshold for a 3×3.

### 6.7 Slide mechanics

On pinch lift over a slidable (empty-adjacent) piece:

- Piece becomes the `heldPiece` for that player.
- Piece's rendered position follows the pinch midpoint (transformed into board coordinates).

On pinch release:

- Compute which cell the pinch midpoint is over.
- If that cell is the current empty cell **and** the held piece is adjacent to the empty in the current board → swap them. Increment / decrement `correctCount` based on the new positions. Play slide SFX.
- Otherwise → piece returns to its original cell. No SFX.

If pinch is lost (hand drops out, fingers separate) before release → same as drop-elsewhere: piece returns to its cell.

### 6.8 Win condition resolution

Inside `tick`, after each board mutation:

- If `p1.correctCount === 9` and `winner` is unset → set `winner = 'p1'`, freeze both boards, transition to result.
- Same for `p2`.
- If `remainingMs <= 0` → compare correctCounts; higher wins, equal is a draw. Transition to result.

## 7. Error handling and edge cases

| Situation | Behavior |
| --- | --- |
| Webcam permission denied | Friendly modal: "We need camera access to track your hands." Retry button calls `getUserMedia` again. |
| MediaPipe fails to load | Splash fallback: "Tracking system unavailable — please refresh." Logs the error. |
| Both hands lost mid-snip | In-progress snip resets to `idle`. Player retries. |
| Hand lost mid-drag | Held piece snaps back to its cell. No penalty. |
| Bystander in frame | Extra hands are dropped — keep the 2 most vertically central per side. |
| Player drops piece on a non-adjacent cell | Piece snaps back silently. |
| Browser tab loses focus | Pause game timer + suspend MediaPipe loop. Resume on focus. |
| Low-resolution webcam | Tracking Check shows a soft warning ("Camera quality is low — pieces may look blurry") but proceeds. |
| FPS drops below 18 for >3 seconds | Log a console warning. No user-facing change. |

## 8. Performance targets

- **MediaPipe model:** `hand_landmarker.task` (lite variant), `numHands: 4`, `runningMode: 'VIDEO'`, GPU delegate when available.
- **Camera constraint:** request 1280×720 @ 30 FPS, fallback to whatever the browser provides.
- **Acceptance baseline:** sustained ≥20 FPS detection with 4 hands on the demo laptop. Verify before the conference.
- **Render target:** ≥30 FPS canvas draws.
- The video element is sized to display; the canvas operates on native video resolution for sharp snip captures.

## 9. Project structure

```
src/
  lib/
    vision/
      mediapipe.ts
      webcam.ts
      oneEuro.ts
      frameLoop.ts
      types.ts
    gesture/
      pinch.ts
      cursor.ts
      assign.ts
    game/
      state.ts
      tick.ts
      board.ts
      snip.ts
      slicer.ts
      history.ts
    render/
      canvas.ts
      drawLandmarks.ts
      drawSnipRect.ts
      drawPuzzle.ts
    audio/
      sfx.ts
      music.ts
      assets.ts
    ui/
      Splash.svelte
      Nicknames.svelte
      TrackingCheck.svelte
      SnipPhase.svelte
      Countdown.svelte
      SolvePhase.svelte
      ResultScreen.svelte
      Hud.svelte
      components/         # shadcn-svelte primitives (Button, Input, Dialog, ...)
    store.svelte.ts       # top-level $state holding GameState
  routes/
    +page.svelte          # mounts <App />, wires frame loop
    +layout.svelte        # global styles, fonts
  app.css                 # Tailwind + theme tokens
  app.html
static/
  audio/
    pinch.mp3
    slide.mp3
    countdown-tick.mp3
    countdown-go.mp3
    win-fanfare.mp3
    draw.mp3
    timeup.mp3
    lobby-loop.mp3
    gameplay-loop.mp3
  models/
    hand_landmarker.task
tests/
  unit/
    pinch.test.ts
    assign.test.ts
    board.test.ts
    tick.test.ts
docs/
  superpowers/
    specs/
      2026-05-11-snap-and-solve-design.md
  smoke-test.md
```

## 10. Dependencies

```jsonc
{
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10",
    "animejs": "^4.3",
    "bits-ui": "^1",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "tailwind-variants": "^0.3"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3",
    "@sveltejs/kit": "^2",
    "@sveltejs/vite-plugin-svelte": "^4",
    "svelte": "^5",
    "typescript": "^5",
    "vite": "^5",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4",
    "vitest": "^2"
  }
}
```

shadcn-svelte components are scaffolded via its CLI (`npx shadcn-svelte@latest add button input dialog progress`) into `src/lib/ui/components/`.

## 11. Testing

### 11.1 Unit-tested (vitest, no browser)

- **`gesture/pinch.ts`** — fixture landmark arrays produce expected pinch states. Covers hysteresis, debounce, hand half-out-of-frame.
- **`gesture/assign.ts`** — assorted hand configurations produce expected per-player assignments. Covers crossing hands, bystanders, single-hand players.
- **`game/board.ts`** — scramble always yields a solvable board; slide is rejected for non-adjacent pieces; `correctCount` is computed correctly after each operation.
- **`game/tick.ts`** — drive the state machine through complete flows with synthetic frames; assert correct transitions and end conditions.

### 11.2 Not unit-tested (human-judged)

- Canvas rendering (visual correctness).
- MediaPipe integration (live webcam required).
- Audio.

### 11.3 Manual smoke test (`docs/smoke-test.md`)

Before each commit-to-main and before the conference:

1. Splash → Nicknames → Tracking Check passes with 4 hands.
2. Both players can complete a snip; rectangles render live; lock-in fires at 1500 ms.
3. Countdown plays, audio ducks, "GO!" transitions cleanly.
4. Both players can pick up, drag, and drop pieces; correct slides land; wrong-cell drops snap back silently.
5. Solve a board → win screen shows the correct winner.
6. Let the timer expire with mixed correctness → result is determined by `correctCount`.
7. Rematch button restarts cleanly with same nicknames.
8. Refuse webcam permission → friendly modal appears with a working retry.

## 12. Deployment

- **Adapter:** `@sveltejs/adapter-auto` — produces a static or function build depending on host.
- **Vercel:** zero-config; `vercel.json` only if needed for headers.
- **Local:** `npm run build && npm run preview` for the demo laptop; bookmarked at `localhost:4173`.
- **Asset budget:** keep total page weight under 10 MB (model file is ~6 MB; audio ~1 MB; JS bundle ~300 KB).
- **Browser support:** Chrome / Edge / Safari latest. No IE / no legacy.

## 13. Out of scope for v1

- Leaderboard UI screen (data captured, screen deferred).
- Persistent storage (localStorage / backend).
- Networked multiplayer.
- Mobile / tablet.
- Difficulty levels (4×4, 5×5).
- Internationalization.
- Accessibility for one-handed players.

## 14. Open risks

1. **4-hand MediaPipe FPS on lower-end laptops.** Mitigation: lite model, GPU delegate, fallback warning if FPS dips below 18.
2. **Conference lighting.** Mitigation: the tracking-check phase enforces a confidence threshold before the game can start.
3. **Booth audio levels.** Mitigation: keep music quiet and SFX punchy; provide a mute toggle on every screen (top-right corner).
4. **Long demo sessions causing webcam permission re-prompts.** Mitigation: instruct booth staff to keep one Chrome window open all day with permission pre-granted.

## 15. Decisions log (summary)

| Topic | Decision | Section |
| --- | --- | --- |
| Architecture | Single device, single webcam, split-screen | §3 |
| Puzzle mechanic | Classic 3×3 sliding (8 + empty) | §4.7 |
| Hand gesture (puzzle) | Pinch-and-drag | §6.7 |
| Snipping | Two-handed framing, both pinch, 1.5 s hold to confirm | §4.5, §6.5 |
| Win condition | First to solve OR most correct at 5:00 | §4.7, §6.8 |
| Stack | Svelte 5 + SvelteKit 2 + TS + Tailwind 4 + shadcn-svelte + anime.js v4 | §10 |
| Hosting | Vercel + localhost (adapter-auto) | §12 |
| Audio | SFX + ambient music | §4 (per phase) |
| Theme | Playful / arcade | §1 |
| Tracking check | Yes, gate-keeps the game | §4.4 |
| Leaderboard | Deferred; data captured in `gameHistory` | §4.8, §13 |
