# Snap & Solve

[![CI](https://github.com/SUTD-AI-Interest-Group/Snap-Solve-NAISC-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/SUTD-AI-Interest-Group/Snap-Solve-NAISC-2026/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A 2-player, hand-tracked sliding-puzzle game for the SUTD AI student conference (NAISC). Players stand side-by-side at one laptop with one webcam, frame a "snip" of the camera view with two-handed pinch gestures, then race to reassemble that snip as a 3×3 sliding puzzle — also using pinch-and-drag.

![Snap & Solve gameplay](docs/gameplay.png)

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
npm run check    # svelte-kit sync (regenerates types) + svelte-check type check
npm run lint     # prettier --check + eslint
npm run format   # prettier --write
```

## Offline support

After the first online visit, a service worker caches everything the game needs — app shell, MediaPipe WASM, hand-tracking model, audio — so subsequent loads work fully offline. Verify with the "Offline boot" checklist in `docs/smoke-test.md` before the conference.

The "Offline" pill in the top-left of the screen is a network-status indicator (driven by `navigator.onLine`); it confirms the browser thinks it has no connectivity but doesn't itself verify that the SW is serving requests. Use DevTools → Application → Service Workers (and Cache Storage) for that.

## Project structure

See `CLAUDE.md` for the architecture overview (data flow, key invariants, phase state machine).

```
src/lib/
  vision/      # webcam, MediaPipe Hand Landmarker, smoothing, frame loop
  gesture/     # pinch detection, cursor, hand-to-player assignment (pure)
  game/        # state machine, board ops, snip math, slicer (pure)
  render/      # canvas drawing
  audio/       # SFX + music managers
  ui/          # Svelte components
  db/          # IndexedDB leaderboard
  components/  # shadcn-style UI primitives
```

## Smoke test

`docs/smoke-test.md` is the manual smoke-test checklist. Run it before each commit-to-main and before the conference.

## Audio

Audio files in `static/audio/` are real assets (no longer zero-byte placeholders). All are public-domain / CC0 — no attribution required, but credit is listed below for the curious.

| File                                  | Source                                                                                                     | License |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------- |
| `pinch.mp3` (click_005)               | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds)                                     | CC0     |
| `slide.mp3` (switch_007)              | Kenney — Interface Sounds                                                                                  | CC0     |
| `countdown-tick.mp3` (tick_002)       | Kenney — Interface Sounds                                                                                  | CC0     |
| `countdown-go.mp3` (confirmation_004) | Kenney — Interface Sounds                                                                                  | CC0     |
| `win-fanfare.mp3` (confirmation_002)  | Kenney — Interface Sounds                                                                                  | CC0     |
| `draw.mp3` (bong_001)                 | Kenney — Interface Sounds                                                                                  | CC0     |
| `timeup.mp3` (error_005)              | Kenney — Interface Sounds                                                                                  | CC0     |
| `gameplay-loop.mp3`                   | ["Chiptune Battle Music" by pmiller](https://opengameart.org/content/chiptune-battle-music) on OpenGameArt | CC0     |
| `lobby-loop.mp3`                      | same source, transcoded with `atempo=0.85, volume=-4dB` for a mellower lobby feel                          | CC0     |

The audio module gracefully no-ops on any missing or undecodable asset, so the game stays playable even with files removed.

To replace with new tracks, drop a new file at the same path. The interface looks them up by filename in `src/lib/audio/assets.ts`.

## Deploy

`@sveltejs/adapter-auto` handles Vercel automatically. Push the repo to GitHub, import in Vercel, done.

## Acknowledgements

- Hand tracking: [@mediapipe/tasks-vision](https://github.com/google-ai-edge/mediapipe) — Apache 2.0. WASM and `hand_landmarker.task` model are self-hosted under `static/mediapipe/` for offline boot.
- See "Audio" section for SFX/music attribution.

## Backlog (KIV)

Tracked here, not blocking the conference demo:

- **OneEuro filter key stability** (`src/lib/vision/frameLoop.ts:28`): re-key by MediaPipe handedness after verifying with logging that hand order swaps in practice.
- Snip preview on the result screen (show the captured snip next to the final board).
- Move tunable constants into `src/lib/config.ts`.
- Admin keyboard shortcut to skip phases for booth troubleshooting.
- Replay of completed games.
