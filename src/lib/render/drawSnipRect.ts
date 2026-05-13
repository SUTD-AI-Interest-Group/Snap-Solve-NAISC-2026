import type { Rect } from '$lib/vision/types';

export function drawSnipRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  holdRatio: number,
  color: string
) {
  const { width: w, height: h } = ctx.canvas;
  const x = rect.x * w;
  const y = rect.y * h;
  const rw = rect.w * w;
  const rh = rect.h * h;
  ctx.save();
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeRect(x, y, rw, rh);
  ctx.setLineDash([]);
  // Hold progress ring at top-left
  if (holdRatio > 0) {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x + 20, y + 20, 16, -Math.PI / 2, -Math.PI / 2 + holdRatio * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawLockedSnip(ctx: CanvasRenderingContext2D, rect: Rect, color: string) {
  const { width: w, height: h } = ctx.canvas;
  const x = rect.x * w;
  const y = rect.y * h;
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.strokeRect(x, y, rect.w * w, rect.h * h);
  // Filled corner marks.
  ctx.fillStyle = color;
  const s = 14;
  for (const [cx, cy] of [
    [x, y],
    [x + rect.w * w - s, y],
    [x, y + rect.h * h - s],
    [x + rect.w * w - s, y + rect.h * h - s]
  ])
    ctx.fillRect(cx, cy, s, s);
  ctx.restore();
}
