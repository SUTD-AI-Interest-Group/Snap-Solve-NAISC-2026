import type { Hand } from '$lib/vision/types';

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

export function drawHandLandmarks(ctx: CanvasRenderingContext2D, hand: Hand, color = '#a3ff00') {
  const { width: w, height: h } = ctx.canvas;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (const [a, b] of CONNECTIONS) {
    const la = hand.landmarks[a];
    const lb = hand.landmarks[b];
    ctx.moveTo((1 - la.x) * w, la.y * h);
    ctx.lineTo((1 - lb.x) * w, lb.y * h);
  }
  ctx.stroke();
  for (const lm of hand.landmarks) {
    ctx.beginPath();
    ctx.arc((1 - lm.x) * w, lm.y * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
