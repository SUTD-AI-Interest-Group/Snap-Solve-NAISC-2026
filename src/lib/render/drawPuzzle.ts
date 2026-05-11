import type { Board } from '$lib/game/board';
import type { Rect, Point } from '$lib/vision/types';

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  pieces: ImageBitmap[],
  area: Rect,
  highlightColor = '#ffd66b'
) {
  const cellW = area.w / 3;
  const cellH = area.h / 3;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(area.x - 8, area.y - 8, area.w + 16, area.h + 16);
  ctx.restore();

  // Origin placeholder: when a piece is lifted, render a dashed outline on
  // the cell it came from so the player can see where to drop it back to
  // cancel.
  const heldOriginCell = board.heldBy != null ? board.heldPieceCell : -1;
  if (heldOriginCell >= 0) {
    const oc = heldOriginCell % 3;
    const or = Math.floor(heldOriginCell / 3);
    const ox = area.x + oc * cellW;
    const oy = area.y + or * cellH;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(ox + 4, oy + 4, cellW - 8, cellH - 8);
    ctx.restore();
  }

  // Target glow: while a piece is held, the cell the cursor is currently
  // over (if any, and different from origin) gets a bright glowing ring in
  // the player's tint — tells the player "release here to swap."
  let targetCell = -1;
  if (board.heldBy != null && board.heldCursor) {
    const tx = board.heldCursor.x;
    const ty = board.heldCursor.y;
    if (tx >= 0 && tx <= 1 && ty >= 0 && ty <= 1) {
      const tc = Math.max(0, Math.min(2, Math.floor(tx * 3)));
      const tr = Math.max(0, Math.min(2, Math.floor(ty * 3)));
      const idx = tr * 3 + tc;
      if (idx !== heldOriginCell) targetCell = idx;
    }
  }

  for (let i = 0; i < 9; i++) {
    const id = board.cells[i];
    const c = i % 3;
    const r = Math.floor(i / 3);
    const x = area.x + c * cellW;
    const y = area.y + r * cellH;
    if (board.heldPieceCell === i && board.heldBy != null) continue;
    if (i === targetCell) {
      ctx.save();
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = highlightColor;
      ctx.shadowBlur = 18;
      ctx.strokeRect(x - 2, y - 2, cellW + 4, cellH + 4);
      ctx.restore();
    }
    drawPiece(ctx, pieces[id], { x, y, w: cellW, h: cellH }, {
      isCorrect: id === i,
      highlightColor
    });
  }

  if (board.heldBy && board.heldCursor) {
    const id = board.cells[board.heldPieceCell];
    if (id !== undefined) {
      const px = area.x + board.heldCursor.x * area.w - cellW / 2;
      const py = area.y + board.heldCursor.y * area.h - cellH / 2;
      ctx.save();
      ctx.shadowColor = highlightColor;
      ctx.shadowBlur = 30;
      drawPiece(ctx, pieces[id], { x: px, y: py, w: cellW * 1.08, h: cellH * 1.08 }, {
        isCorrect: false,
        highlightColor,
        lifted: true
      });
      ctx.restore();
    }
  }
}

function drawPiece(
  ctx: CanvasRenderingContext2D,
  bmp: ImageBitmap | undefined,
  rect: Rect,
  opts: { isCorrect: boolean; highlightColor: string; lifted?: boolean }
) {
  ctx.save();
  // Rounded rect clip
  const radius = 8;
  ctx.beginPath();
  ctx.moveTo(rect.x + radius, rect.y);
  ctx.lineTo(rect.x + rect.w - radius, rect.y);
  ctx.quadraticCurveTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + radius);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h - radius);
  ctx.quadraticCurveTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - radius, rect.y + rect.h);
  ctx.lineTo(rect.x + radius, rect.y + rect.h);
  ctx.quadraticCurveTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - radius);
  ctx.lineTo(rect.x, rect.y + radius);
  ctx.quadraticCurveTo(rect.x, rect.y, rect.x + radius, rect.y);
  ctx.closePath();
  ctx.clip();
  if (bmp) {
    ctx.drawImage(bmp, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  } else {
    ctx.fillStyle = '#444';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();

  ctx.save();
  if (opts.isCorrect) {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 4;
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
  }
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.restore();
}
