# Snap & Solve — Manual Smoke Test

Run before each commit-to-main and before the conference. Browser: Chrome (latest).

## Setup

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173` in Chrome.

## Checklist

1. [ ] Webcam permission prompt appears; grant.
2. [ ] Splash renders with bouncing colored letters and a working "Press SPACE or click" button.
3. [ ] Nicknames: both fields accept 1–12 chars; "Let's go!" disabled until both are filled; Enter submits.
4. [ ] Tracking Check: raising 2 hands on each side fills both progress bars in ~2 seconds; the 3-second auto-countdown then appears and the game advances to Snip.
5. [ ] Snip: pinching one hand shows a corner pin; pinching both hands draws a live neon rectangle.
6. [ ] Snip: holding both pinches for 1.5 s fills the progress ring and shows "Locked in ✓" with a static corner-mark overlay on the locked rectangle.
7. [ ] Both players locked in → snip thumbnails appear under the countdown overlay with anime.js scale-pop on each digit.
8. [ ] Solve: pieces render scrambled in a 3×3 grid; slidable pieces glow; pinch over a slidable piece lifts it (it floats with the cursor); release over the empty cell performs the slide; correct count increments; slide SFX plays (once real audio is dropped in).
9. [ ] Wrong drop: release away from empty cell — piece returns; no slide SFX.
10. [ ] Win: complete a board → result screen shows the correct winner name, time, and confetti animation.
11. [ ] Timeout: wait for the 5:00 timer to expire with mixed correctness → result based on `correctCount` (higher wins; equal is draw).
12. [ ] Rematch button: returns to Tracking Check with same nicknames.
13. [ ] New players button: returns to Nicknames blank.
14. [ ] Mute button (top-right): toggle silences SFX and music; emoji flips.
15. [ ] Deny camera permission in a fresh incognito window → friendly modal with a working Retry that reloads after re-granting.
16. [ ] FPS (Chrome devtools Performance panel, "Frames per second" meter): sustained ≥ 20 FPS with 4 hands present on the demo laptop.

## Performance acceptance

- Run on the actual demo laptop, with the actual webcam, under approximate booth lighting.
- 4 hands present, mid-game (solve phase): MediaPipe detection ≥ 20 FPS, render ≥ 30 FPS.

## Offline boot

1. [ ] Visit production URL while online; let splash render.
2. [ ] DevTools → Application → Service Workers → confirm `service-worker.js` is `activated and running`.
3. [ ] DevTools → Application → Cache Storage → confirm `snap-solve-<version>` is populated (includes `/mediapipe/wasm/`, `/mediapipe/hand_landmarker.task`, `/audio/*`, app shell).
4. [ ] DevTools → Network → check "Offline".
5. [ ] Hard refresh (Ctrl/Cmd+Shift+R). Splash must render, tracking-check must work, one full game round must complete.
6. [ ] Confirm the "Offline · cached" pill is visible in top-left.
7. [ ] Toggle Network back online; pill disappears.

## Conference-day pre-flight

- [ ] Pre-build with `npm run build && npm run preview`. Bookmark `http://localhost:4173`.
- [ ] Pre-grant Chrome camera permission for both `localhost:4173` and the Vercel URL.
- [ ] Bring a backup USB webcam.
- [ ] Mute button works; verify booth-acceptable volume on lobby + gameplay music.
