import type { Frame } from './types';
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
  const filters = new Map<string, OneEuroPointFilter>();
  let stopped = false;

  function tick() {
    if (stopped) return;
    const now = performance.now();
    const dt = now - last;
    last = now;
    if (video.readyState >= 2) {
      const hands = detectHands(video, now);
      const smoothed = hands.map((h, hi) => ({
        ...h,
        landmarks: h.landmarks.map((lm, li) => {
          const key = `${hi}:${li}`;
          let f = filters.get(key);
          if (!f) {
            f = new OneEuroPointFilter();
            filters.set(key, f);
          }
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
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}
