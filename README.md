# Snap & Solve

A 2-player, hand-tracked sliding-puzzle game for the SUTD AI student conference (NAISC). Players stand side-by-side at one laptop with one webcam, frame a "snip" of the camera view with two-handed pinch gestures, then race to reassemble that snip as a 3×3 sliding puzzle — also using pinch-and-drag.

Built with **Svelte 5 + SvelteKit 2 + TypeScript + Tailwind v4 + anime.js v4 + MediaPipe Tasks Vision**.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

For production preview:

```bash
npm run build
npm run preview  # http://localhost:4173
```

## Test

```bash
npm test         # vitest unit tests for pure logic
npm run check    # svelte-check type check
```

## Project structure

See `docs/superpowers/specs/2026-05-11-snap-and-solve-design.md` for the full design spec, and `docs/superpowers/plans/2026-05-11-snap-and-solve.md` for the implementation plan.

```
src/lib/
  vision/      # webcam, MediaPipe Hand Landmarker, smoothing, frame loop
  gesture/     # pinch detection, cursor, hand-to-player assignment (pure)
  game/        # state machine, board ops, snip math, slicer, history (pure)
  render/      # canvas drawing
  audio/       # SFX + music managers
  ui/          # Svelte components
  components/  # shadcn-style UI primitives
```

## Smoke test

`docs/smoke-test.md` is the manual smoke-test checklist. Run it before each commit-to-main and before the conference.

## Audio

Audio files in `static/audio/` ship as zero-byte placeholders. Replace them with real SFX (≤ 1 s each) and music loops before the conference. The audio module gracefully no-ops on missing assets so the game is fully playable without them.

Required filenames:
- `pinch.mp3`, `slide.mp3`, `countdown-tick.mp3`, `countdown-go.mp3`
- `win-fanfare.mp3`, `draw.mp3`, `timeup.mp3`
- `lobby-loop.mp3`, `gameplay-loop.mp3`

## Deploy

`@sveltejs/adapter-auto` handles Vercel automatically. Push the repo to GitHub, import in Vercel, done.
