import type { Point } from '$lib/vision/types';

type PinchKind = 'idle' | 'pinching' | 'holding';

/**
 * Solve-phase pointer: a translucent gray disc anchored on the player's
 * index fingertip. When `selected` (pinch engaged or holding) a colored
 * border ring lights up to signal selection.
 */
export function drawPointer(
  ctx: CanvasRenderingContext2D,
  pos: Point,
  selected: boolean,
  color: string
) {
  const { width: w, height: h } = ctx.canvas;
  const x = pos.x * w;
  const y = pos.y * h;
  const r = 24;
  ctx.save();
  // Translucent gray fill
  ctx.fillStyle = 'rgba(180, 180, 180, 0.42)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Border — colored when selected, faint white otherwise
  if (selected) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Crosshair center dot
  ctx.shadowBlur = 0;
  ctx.fillStyle = selected ? color : 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCursor(
  ctx: CanvasRenderingContext2D,
  cursor: Point,
  pinch: PinchKind,
  color: string,
  label?: string
) {
  const { width: w, height: h } = ctx.canvas;
  const x = cursor.x * w;
  const y = cursor.y * h;
  const baseRadius = pinch === 'holding' ? 14 : pinch === 'pinching' ? 10 : 7;
  ctx.save();
  // Outer halo
  ctx.shadowColor = color;
  ctx.shadowBlur = pinch === 'holding' ? 22 : 10;
  ctx.fillStyle = pinch === 'holding' ? color : 'rgba(255,255,255,0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Inner dot
  ctx.shadowBlur = 0;
  ctx.fillStyle = pinch === 'holding' ? '#fff' : color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2, baseRadius - 5), 0, Math.PI * 2);
  ctx.fill();
  // Pulse ring while pinching (engaged but not yet locked into hold)
  if (pinch === 'pinching') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Optional player label tag
  if (label) {
    ctx.globalAlpha = 1;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(label, x + baseRadius + 6, y - baseRadius);
  }
  ctx.restore();
}
