import type { Point } from '$lib/vision/types';

type PinchKind = 'idle' | 'pinching' | 'holding';

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
