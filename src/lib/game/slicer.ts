import type { Rect, PieceId } from '../vision/types';

export function pieceRect(id: PieceId, snipW: number, snipH: number): Rect {
  const row = Math.floor(id / 3);
  const col = id % 3;
  const w = Math.floor(snipW / 3);
  const h = Math.floor(snipH / 3);
  return { x: col * w, y: row * h, w, h };
}

export async function sliceSnipInto9Pieces(snip: ImageBitmap): Promise<ImageBitmap[]> {
  const pieces: ImageBitmap[] = [];
  for (let id = 0; id < 9; id++) {
    const r = pieceRect(id as PieceId, snip.width, snip.height);
    pieces.push(await createImageBitmap(snip, r.x, r.y, r.w, r.h));
  }
  return pieces;
}
