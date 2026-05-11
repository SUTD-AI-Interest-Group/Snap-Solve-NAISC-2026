<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { openWebcam, type WebcamHandle } from '$lib/vision/webcam';
  import { initHandLandmarker } from '$lib/vision/mediapipe';
  import { startFrameLoop } from '$lib/vision/frameLoop';
  import { game } from '$lib/store.svelte';
  import { tick as gameTick } from '$lib/game/tick';
  import { normalizedPinchDistance, advancePinchState, type PinchState } from '$lib/gesture/pinch';
  import { getCursorPoint } from '$lib/gesture/cursor';
  import { captureSnip } from '$lib/game/snip';
  import { sliceSnipInto9Pieces } from '$lib/game/slicer';
  import { pushResult } from '$lib/game/history';
  import { resizeCanvasToDisplay, drawVideoMirrored } from '$lib/render/canvas';
  import { drawHandLandmarks } from '$lib/render/drawLandmarks';
  import { drawSnipRect, drawLockedSnip } from '$lib/render/drawSnipRect';
  import { drawBoard } from '$lib/render/drawPuzzle';
  import type { Frame, Hand } from '$lib/vision/types';
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

  let cam: WebcamHandle | null = null;
  let permError = $state<string | null>(null);
  let canvas: HTMLCanvasElement | undefined = $state();
  let lastFrame: Frame | null = null;
  let snipCaptureInProgress = false;

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

  function framesToGestures(f: Frame, dt: number): GestureSnapshot {
    return {
      p1: {
        left: handToGesture(f.players.p1.left, 'p1.left', dt),
        right: handToGesture(f.players.p1.right, 'p1.right', dt)
      },
      p2: {
        left: handToGesture(f.players.p2.left, 'p2.left', dt),
        right: handToGesture(f.players.p2.right, 'p2.right', dt)
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
      if (!p1.snapshot) p1.snapshot = await captureSnip(cam.video, p1.rect, w, h);
      if (!p2.snapshot) p2.snapshot = await captureSnip(cam.video, p2.rect, w, h);
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
    resizeCanvasToDisplay(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const showVideo = game.state.phase !== 'splash' && game.state.phase !== 'nicknames';
    if (showVideo) {
      drawVideoMirrored(ctx, cam.video);
      // Dark scrim for legibility
      ctx.fillStyle = 'rgba(20,20,30,0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const showLandmarks =
      game.state.phase === 'trackingCheck' ||
      game.state.phase === 'snip';
    if (showLandmarks && lastFrame) {
      const p1Color = '#ff8a5b';
      const p2Color = '#5bb8ff';
      if (lastFrame.players.p1.left) drawHandLandmarks(ctx, lastFrame.players.p1.left, p1Color);
      if (lastFrame.players.p1.right) drawHandLandmarks(ctx, lastFrame.players.p1.right, p1Color);
      if (lastFrame.players.p2.left) drawHandLandmarks(ctx, lastFrame.players.p2.left, p2Color);
      if (lastFrame.players.p2.right) drawHandLandmarks(ctx, lastFrame.players.p2.right, p2Color);
    }

    if (game.state.phase === 'snip') {
      for (const side of ['p1', 'p2'] as const) {
        const ss = game.state[side];
        const color = side === 'p1' ? '#ff8a5b' : '#5bb8ff';
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

    if (game.state.phase === 'solve' || game.state.phase === 'countdown' || game.state.phase === 'result') {
      const W = canvas.width;
      const H = canvas.height;
      const top = Math.max(80, H * 0.12);
      const side = Math.min(H - top - 40, W * 0.42);
      const yArea = top + (H - top - side) / 2;
      const margin = (W / 2 - side) / 2;
      const p1Area = { x: margin, y: yArea, w: side, h: side };
      const p2Area = { x: W / 2 + margin, y: yArea, w: side, h: side };
      if (game.state.phase === 'solve') {
        drawBoard(ctx, game.state.p1.board, game.state.p1.pieces, p1Area, '#ffb866');
        drawBoard(ctx, game.state.p2.board, game.state.p2.pieces, p2Area, '#66b8ff');
      }
      if (game.state.phase === 'countdown') {
        // Pre-scrambled preview: just show snip thumbnails for tease
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(p1Area.x - 8, p1Area.y - 8, p1Area.w + 16, p1Area.h + 16);
        ctx.fillRect(p2Area.x - 8, p2Area.y - 8, p2Area.w + 16, p2Area.h + 16);
        if (game.state.p1.snip) ctx.drawImage(game.state.p1.snip, p1Area.x, p1Area.y, p1Area.w, p1Area.h);
        if (game.state.p2.snip) ctx.drawImage(game.state.p2.snip, p2Area.x, p2Area.y, p2Area.w, p2Area.h);
        ctx.restore();
      }
      if (game.state.phase === 'result') {
        drawBoard(ctx, game.state.p1.board, game.state.p1.pieces, p1Area, '#ffb866');
        drawBoard(ctx, game.state.p2.board, game.state.p2.pieces, p2Area, '#66b8ff');
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

  onMount(() => {
    let stopLoop: (() => void) | null = null;
    let aborted = false;

    (async () => {
      try {
        await preloadSfx();
        playMusic('lobby');
        cam = await openWebcam();
        await initHandLandmarker(4);
        if (aborted) return;
        stopLoop = startFrameLoop({
          video: cam.video,
          onFrame: (frame, dt) => {
            const gestures = framesToGestures(frame, dt);
            lastFrame = frame;
            game.state = gameTick(game.state, { type: 'tick', dtMs: dt }, gestures);
            reactAudio();
            maybeCaptureLockedSnips();
            draw();
          }
        });
      } catch (e: any) {
        permError = e?.message ?? String(e);
      }
    })();

    return () => {
      aborted = true;
      stopLoop?.();
      cam?.stop();
    };
  });
</script>

<canvas bind:this={canvas} class="fixed inset-0 w-screen h-screen z-0"></canvas>

<MuteButton />

{#if permError}
  <div class="absolute inset-0 flex items-center justify-center z-50 bg-black/80">
    <div class="bg-black/90 border-2 border-white/20 p-10 rounded-2xl max-w-md text-center">
      <h3 class="text-3xl font-black mb-4">Camera access needed</h3>
      <p class="opacity-80">{permError}</p>
      <button class="mt-6 px-6 py-3 bg-white text-black rounded-xl font-bold" onclick={() => location.reload()}>Retry</button>
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
