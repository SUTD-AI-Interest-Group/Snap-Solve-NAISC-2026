import type { Point, Rect, PlayerId } from '../vision/types';

export function rectFromCorners(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function clampToPlayerHalf(p: Point, player: PlayerId): Point {
  if (player === 'p1') return { x: Math.min(p.x, 0.5), y: p.y };
  return { x: Math.max(p.x, 0.5), y: p.y };
}

export function hasMinSize(r: Rect, videoW: number, videoH: number, minPx = 150): boolean {
  return r.w * videoW >= minPx && r.h * videoH >= minPx;
}

export async function captureSnip(
  source: CanvasImageSource,
  rect: Rect,
  videoW: number,
  videoH: number
): Promise<ImageBitmap> {
  const sx = Math.round(rect.x * videoW);
  const sy = Math.round(rect.y * videoH);
  const sw = Math.round(rect.w * videoW);
  const sh = Math.round(rect.h * videoH);
  return createImageBitmap(source, sx, sy, sw, sh);
}
