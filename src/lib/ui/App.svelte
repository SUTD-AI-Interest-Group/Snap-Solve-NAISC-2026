<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { openWebcam, type WebcamHandle } from '$lib/vision/webcam';
  import { initHandLandmarker } from '$lib/vision/mediapipe';
  import { startFrameLoop } from '$lib/vision/frameLoop';
  import { game, paused } from '$lib/store.svelte';
  import { tick as gameTick, getBoardArea } from '$lib/game/tick';
  import { normalizedPinchDistance, advancePinchState, type PinchState } from '$lib/gesture/pinch';
  import { getCursorPoint } from '$lib/gesture/cursor';
  import { captureSnip } from '$lib/game/snip';
  import { sliceSnipInto9Pieces } from '$lib/game/slicer';
  import { pushResult } from '$lib/game/history';
  import { resizeCanvasToDisplay, drawVideoMirrored } from '$lib/render/canvas';
  import { drawHandLandmarks } from '$lib/render/drawLandmarks';
  import { drawSnipRect, drawLockedSnip } from '$lib/render/drawSnipRect';
  import { drawBoard } from '$lib/render/drawPuzzle';
  import { CANVAS_COLORS } from '$lib/render/theme';
  import { drawCursor, drawPointer } from '$lib/render/drawCursor';
  import type { Frame, Hand, PlayerHands, PlayerId } from '$lib/vision/types';
  import type { HandGesture, GestureSnapshot } from '$lib/game/state';
  import { preloadSfx, playSfx } from '$lib/audio/sfx';
  import { playMusic } from '$lib/audio/music';

  import Splash from './Splash.svelte';
  import Nicknames from './Nicknames.svelte';
  import TrackingCheck from './TrackingCheck.svelte';
  import SnipPhase from './SnipPhase.svelte';
  import Countdown from './Countdown.svelte';
  import SolvePhase from './SolvePhase.svelte';
  import ResultScreen from './ResultScreen.svelte';
  import MuteButton from './MuteButton.svelte';
  import PauseMenu from './PauseMenu.svelte';

  let cam: WebcamHandle | null = null;
  let stopLoop: (() => void) | null = null;
  let permError = $state<string | null>(null);
  let trackingError = $state<string | null>(null);
  let initializing = $state(true);
  let initToken = 0;
  let canvas: HTMLCanvasElement | undefined = $state();
  let lastFrame: Frame | null = null;
  let lastGestures: GestureSnapshot | null = null;
  let snipCaptureInProgress = false;

  function describeCameraError(e: unknown): string {
    const err = e as { name?: string; message?: string } | null;
    const name = err?.name ?? 'Error';
    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Camera access was denied. Open the site settings in your browser, set Camera to Allow, then click Retry.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera detected. Connect a webcam and click Retry.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'The camera is busy — another app or tab is using it. Close it and click Retry.';
      case 'OverconstrainedError':
        return 'This camera does not support the requested settings. Try a different camera.';
      case 'AbortError':
        return 'Camera start was interrupted. Click Retry.';
      case 'SecurityError':
        return 'Camera access blocked by the browser (requires HTTPS or localhost).';
      default:
        return `Camera error (${name}): ${err?.message ?? 'unknown'}. Click Retry.`;
    }
  }

  async function init() {
    const myToken = ++initToken;
    permError = null;
    trackingError = null;
    initializing = true;

    // Tear down any partial state from a previous attempt.
    stopLoop?.();
    stopLoop = null;
    cam?.stop();
    cam = null;

    // 1. Audio (best-effort, never fatal).
    try {
      await preloadSfx();
      playMusic('lobby');
    } catch (e) {
      console.warn('audio init failed (continuing):', e);
    }
    if (myToken !== initToken) return;

    // 2. Camera — this is the only step that legitimately maps to "camera access needed".
    try {
      cam = await openWebcam();
    } catch (e) {
      if (myToken !== initToken) return;
      permError = describeCameraError(e);
      initializing = false;
      return;
    }
    if (myToken !== initToken) {
      cam?.stop();
      cam = null;
      return;
    }

    // 3. MediaPipe — wasm + model load. Separate error category.
    try {
      await initHandLandmarker(4);
    } catch (e) {
      if (myToken !== initToken) return;
      const msg = (e as { message?: string } | null)?.message ?? String(e);
      trackingError = `Hand tracking failed to load: ${msg}. Check your internet connection and click Retry.`;
      cam?.stop();
      cam = null;
      initializing = false;
      return;
    }
    if (myToken !== initToken) {
      cam?.stop();
      cam = null;
      return;
    }

    // 4. Start the frame loop.
    stopLoop = startFrameLoop({
      video: cam.video,
      onFrame: (frame, dt) => {
        const gestures = framesToGestures(frame, dt);
        lastFrame = frame;
        lastGestures = gestures;
        if (!paused.value) {
          game.state = gameTick(game.state, { type: 'tick', dtMs: dt }, gestures);
          reactAudio();
          maybeCaptureLockedSnips();
        }
        draw();
      }
    });
    initializing = false;
  }

  function retry() {
    init();
  }

  const pinches: Record<string, PinchState> = {
    'p1.left': { kind: 'idle', heldMs: 0 },
    'p1.right': { kind: 'idle', heldMs: 0 },
    'p2.left': { kind: 'idle', heldMs: 0 },
    'p2.right': { kind: 'idle', heldMs: 0 }
  };
  let lastSlideCounts = { p1: -1, p2: -1 };
  let lastHeldBy = { p1: false as boolean, p2: false as boolean };
  let prevPhase = '';

  function handToGesture(h: Hand | null, slot: string, dtMs: number): HandGesture {
    if (!h) {
      pinches[slot] = { kind: 'idle', heldMs: 0 };
      return { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } };
    }
    const d = normalizedPinchDistance(h);
    pinches[slot] = advancePinchState(pinches[slot], d, dtMs);
    const k = pinches[slot].kind;
    return {
      present: true,
      pinch: k === 'pinching' ? 'pinching' : k === 'holding' ? 'holding' : 'idle',
      cursor: getCursorPoint(h)
    };
  }

  // Solve phase rule: each player uses ONE hand to slide pieces. When both
  // hands are visible in a player's half, pick the one closest to that
  // player's board horizontally — the hand reaching toward the puzzle.
  // Collapse it into the `left` slot and null the other so the existing
  // pinch + cursor logic naturally tracks a single hand per player.
  function pickSolveHand(hands: PlayerHands, player: PlayerId): PlayerHands {
    if (!hands.left && !hands.right) return { left: null, right: null };
    if (!hands.left && hands.right) return { left: hands.right, right: null };
    if (hands.left && !hands.right) return { left: hands.left, right: null };
    const area = getBoardArea(player);
    const center = area.x + area.w / 2;
    const lc = getCursorPoint(hands.left!);
    const rc = getCursorPoint(hands.right!);
    return Math.abs(lc.x - center) <= Math.abs(rc.x - center)
      ? { left: hands.left, right: null }
      : { left: hands.right, right: null };
  }

  function framesToGestures(f: Frame, dt: number): GestureSnapshot {
    let p1Hands = f.players.p1;
    let p2Hands = f.players.p2;
    if (game.state.phase === 'solve') {
      p1Hands = pickSolveHand(p1Hands, 'p1');
      p2Hands = pickSolveHand(p2Hands, 'p2');
    }
    return {
      p1: {
        left: handToGesture(p1Hands.left, 'p1.left', dt),
        right: handToGesture(p1Hands.right, 'p1.right', dt)
      },
      p2: {
        left: handToGesture(p2Hands.left, 'p2.left', dt),
        right: handToGesture(p2Hands.right, 'p2.right', dt)
      }
    };
  }

  async function maybeCaptureLockedSnips() {
    if (snipCaptureInProgress) return;
    if (game.state.phase !== 'snip' || !cam) return;
    const state = game.state;
    const p1 = state.p1;
    const p2 = state.p2;
    if (p1.kind !== 'locked' || p2.kind !== 'locked') return;
    if (p1.snapshot && p2.snapshot) return;
    snipCaptureInProgress = true;
    try {
      const w = cam.video.videoWidth;
      const h = cam.video.videoHeight;
      // Game state stores rects in mirrored screen coords; the video frame
      // is unmirrored, so flip x before reading pixels.
      const unmirror = (r: { x: number; y: number; w: number; h: number }) => ({
        x: 1 - r.x - r.w,
        y: r.y,
        w: r.w,
        h: r.h
      });
      if (!p1.snapshot) p1.snapshot = await captureSnip(cam.video, unmirror(p1.rect), w, h);
      if (!p2.snapshot) p2.snapshot = await captureSnip(cam.video, unmirror(p2.rect), w, h);
      const [p1Pieces, p2Pieces] = await Promise.all([
        sliceSnipInto9Pieces(p1.snapshot),
        sliceSnipInto9Pieces(p2.snapshot)
      ]);
      game.state = gameTick(
        game.state,
        {
          type: 'snipsCaptured',
          p1Setup: { name: state.p1Name, snip: p1.snapshot, pieces: p1Pieces },
          p2Setup: { name: state.p2Name, snip: p2.snapshot, pieces: p2Pieces }
        },
        {
          p1: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } },
          p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
        }
      );
    } catch (e) {
      console.error('snip capture failed', e);
    } finally {
      snipCaptureInProgress = false;
    }
  }

  function reactAudio() {
    const s = game.state;
    // Phase-edge SFX
    if (s.phase !== prevPhase) {
      if (s.phase === 'countdown') playSfx('countdownTick');
      if (s.phase === 'solve') {
        playSfx('countdownGo');
        playMusic('gameplay');
      }
      if (s.phase === 'result') {
        playSfx(s.winner === 'draw' ? 'draw' : 'winFanfare');
        playMusic('lobby');
      }
      if (s.phase === 'splash' || s.phase === 'nicknames' || s.phase === 'trackingCheck') {
        playMusic('lobby');
      }
      prevPhase = s.phase;
    }
    // Slide SFX: detect change in correctCount
    if (s.phase === 'solve') {
      if (lastSlideCounts.p1 !== -1 && s.p1.board.correctCount !== lastSlideCounts.p1) playSfx('slide');
      if (lastSlideCounts.p2 !== -1 && s.p2.board.correctCount !== lastSlideCounts.p2) playSfx('slide');
      lastSlideCounts.p1 = s.p1.board.correctCount;
      lastSlideCounts.p2 = s.p2.board.correctCount;
      // Pickup SFX: detect heldBy edge
      const h1 = !!s.p1.board.heldBy;
      const h2 = !!s.p2.board.heldBy;
      if (h1 && !lastHeldBy.p1) playSfx('pinch');
      if (h2 && !lastHeldBy.p2) playSfx('pinch');
      lastHeldBy.p1 = h1;
      lastHeldBy.p2 = h2;
    } else {
      lastSlideCounts = { p1: -1, p2: -1 };
      lastHeldBy = { p1: false, p2: false };
    }
  }

  function draw() {
    if (!canvas || !cam) return;
    const cv: HTMLCanvasElement = canvas;
    resizeCanvasToDisplay(cv);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const showVideo = game.state.phase !== 'splash' && game.state.phase !== 'nicknames';
    if (showVideo) {
      drawVideoMirrored(ctx, cam.video);
      // Dark scrim for legibility
      ctx.fillStyle = CANVAS_COLORS.scrim;
      ctx.fillRect(0, 0, cv.width, cv.height);
    } else {
      ctx.clearRect(0, 0, cv.width, cv.height);
    }

    const showLandmarks =
      game.state.phase === 'trackingCheck' ||
      game.state.phase === 'snip';
    if (showLandmarks && lastFrame) {
      const p1Color = CANVAS_COLORS.p1;
      const p2Color = CANVAS_COLORS.p2;
      if (lastFrame.players.p1.left) drawHandLandmarks(ctx, lastFrame.players.p1.left, p1Color);
      if (lastFrame.players.p1.right) drawHandLandmarks(ctx, lastFrame.players.p1.right, p1Color);
      if (lastFrame.players.p2.left) drawHandLandmarks(ctx, lastFrame.players.p2.left, p2Color);
      if (lastFrame.players.p2.right) drawHandLandmarks(ctx, lastFrame.players.p2.right, p2Color);
    }

    if (game.state.phase === 'snip') {
      for (const side of ['p1', 'p2'] as const) {
        const ss = game.state[side];
        const color = side === 'p1' ? CANVAS_COLORS.p1 : CANVAS_COLORS.p2;
        if (ss.kind === 'framing' && ss.corner2) {
          const r = {
            x: Math.min(ss.corner1.x, ss.corner2.x),
            y: Math.min(ss.corner1.y, ss.corner2.y),
            w: Math.abs(ss.corner1.x - ss.corner2.x),
            h: Math.abs(ss.corner1.y - ss.corner2.y)
          };
          drawSnipRect(ctx, r, Math.min(1, ss.holdMs / 1500), color);
        } else if (ss.kind === 'locked') {
          drawLockedSnip(ctx, ss.rect, color);
        }
      }
    }

    // Hand overlay differs per phase.
    if (lastGestures) {
      const p1Color = CANVAS_COLORS.p1;
      const p2Color = CANVAS_COLORS.p2;
      if (game.state.phase === 'snip') {
        const p1Name = game.state.p1Name;
        const p2Name = game.state.p2Name;
        for (const [side, color, name] of [
          ['p1', p1Color, p1Name] as const,
          ['p2', p2Color, p2Name] as const
        ]) {
          const hands = lastGestures[side];
          for (const slot of ['left', 'right'] as const) {
            const h = hands[slot];
            if (!h.present) continue;
            const showLabel = slot === 'left' && (h.pinch === 'holding' || h.pinch === 'pinching');
            drawCursor(ctx, h.cursor, h.pinch, color, showLabel ? name : undefined);
          }
        }
      } else if (game.state.phase === 'solve') {
        // One hand per player (collapsed into the left slot by pickSolveHand).
        // Pointer sits on the index fingertip; selection ring lights up when pinched.
        for (const [side, color] of [
          ['p1', p1Color] as const,
          ['p2', p2Color] as const
        ]) {
          const h = lastGestures[side].left;
          if (!h.present) continue;
          const selected = h.pinch === 'pinching' || h.pinch === 'holding';
          drawPointer(ctx, h.cursor, selected, color);
        }
      }
    }

    if (game.state.phase === 'solve' || game.state.phase === 'countdown' || game.state.phase === 'result') {
      // Use the same normalized boxes as the gesture logic so the cursor and
      // the visual grid agree.
      const p1Norm = getBoardArea('p1');
      const p2Norm = getBoardArea('p2');
      const toPx = (n: { x: number; y: number; w: number; h: number }) => ({
        x: n.x * cv.width,
        y: n.y * cv.height,
        w: n.w * cv.width,
        h: n.h * cv.height
      });
      const p1Area = toPx(p1Norm);
      const p2Area = toPx(p2Norm);
      if (game.state.phase === 'solve') {
        drawBoard(ctx, game.state.p1.board, game.state.p1.pieces, p1Area, CANVAS_COLORS.p1Board);
        drawBoard(ctx, game.state.p2.board, game.state.p2.pieces, p2Area, CANVAS_COLORS.p2Board);
      }
      if (game.state.phase === 'countdown') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(p1Area.x - 8, p1Area.y - 8, p1Area.w + 16, p1Area.h + 16);
        ctx.fillRect(p2Area.x - 8, p2Area.y - 8, p2Area.w + 16, p2Area.h + 16);
        if (game.state.p1.snip) ctx.drawImage(game.state.p1.snip, p1Area.x, p1Area.y, p1Area.w, p1Area.h);
        if (game.state.p2.snip) ctx.drawImage(game.state.p2.snip, p2Area.x, p2Area.y, p2Area.w, p2Area.h);
        ctx.restore();
      }
      if (game.state.phase === 'result') {
        drawBoard(ctx, game.state.p1.board, game.state.p1.pieces, p1Area, CANVAS_COLORS.p1Board);
        drawBoard(ctx, game.state.p2.board, game.state.p2.pieces, p2Area, CANVAS_COLORS.p2Board);
      }
    }
  }

  // History capture on entering result phase
  $effect(() => {
    if (game.state.phase === 'result') {
      const s = game.state;
      untrack(() => {
        pushResult({
          p1Name: s.p1.name,
          p2Name: s.p2.name,
          winner: s.winner,
          durationMs: s.durationMs,
          timestamp: Date.now()
        });
      });
    }
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      // Pause is meaningful from the moment the live game starts.
      const p = game.state.phase;
      if (p === 'trackingCheck' || p === 'snip' || p === 'countdown' || p === 'solve') {
        paused.value = !paused.value;
      } else if (p === 'result' && paused.value) {
        paused.value = false;
      }
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    init();
    return () => {
      initToken++; // cancel any in-flight init
      stopLoop?.();
      cam?.stop();
      window.removeEventListener('keydown', onKeydown);
    };
  });
</script>

<canvas bind:this={canvas} class="fixed inset-0 w-screen h-screen z-0"></canvas>

<MuteButton />

{#if permError || trackingError}
  <div class="absolute inset-0 flex items-center justify-center z-50 bg-black/85 backdrop-blur-sm">
    <div class="bg-black/90 border-2 border-white/20 p-10 rounded-2xl max-w-lg text-center">
      <h3 class="font-display text-4xl mb-4 tracking-tight" style="color: var(--color-accent);">
        {permError ? 'Camera access needed' : 'Setup error'}
      </h3>
      <p class="font-sans text-base md:text-lg opacity-85 leading-relaxed">{permError ?? trackingError}</p>
      <div class="mt-6 flex gap-3 justify-center">
        <button
          class="font-display tracking-wide px-6 py-3 bg-white text-black rounded-xl text-lg disabled:opacity-50"
          disabled={initializing}
          onclick={retry}
        >
          {initializing ? 'Trying…' : 'Retry'}
        </button>
        <button
          class="font-display tracking-wide px-6 py-3 border-2 border-white/30 rounded-xl text-lg"
          onclick={() => location.reload()}
        >
          Reload page
        </button>
      </div>
    </div>
  </div>
{:else}
  {#if game.state.phase === 'splash'}<Splash />{/if}
  {#if game.state.phase === 'nicknames'}<Nicknames />{/if}
  {#if game.state.phase === 'trackingCheck'}<TrackingCheck />{/if}
  {#if game.state.phase === 'snip'}<SnipPhase />{/if}
  {#if game.state.phase === 'countdown'}<Countdown />{/if}
  {#if game.state.phase === 'solve'}<SolvePhase />{/if}
  {#if game.state.phase === 'result'}<ResultScreen />{/if}
{/if}

{#if paused.value}<PauseMenu />{/if}
