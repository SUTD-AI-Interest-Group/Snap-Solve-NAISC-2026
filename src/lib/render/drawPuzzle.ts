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

  // Background plate
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(area.x - 8, area.y - 8, area.w + 16, area.h + 16);
  ctx.restore();

  // Slidable highlight ring around neighbors of empty cell
  const empty = board.emptyIndex;
  const er = Math.floor(empty / 3);
  const ec = empty % 3;
  const neighborCells = [empty - 3, empty + 3, empty - 1, empty + 1].filter((n) => {
    if (n < 0 || n >= 9) return false;
    const nr = Math.floor(n / 3);
    const nc = n % 3;
    return Math.abs(nr - er) + Math.abs(nc - ec) === 1;
  });

  for (let i = 0; i < 9; i++) {
    const id = board.cells[i];
    const c = i % 3;
    const r = Math.floor(i / 3);
    const x = area.x + c * cellW;
    const y = area.y + r * cellH;
    if (id === null) {
      // Empty cell — show subtle dashed outline
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeRect(x + 4, y + 4, cellW - 8, cellH - 8);
      ctx.restore();
      continue;
    }
    const isHeld = board.heldPieceCell === i && board.heldBy != null;
    if (isHeld) continue; // Drawn last on top
    drawPiece(ctx, pieces[id], { x, y, w: cellW, h: cellH }, {
      isCorrect: id === i,
      isSlidable: neighborCells.includes(i),
      highlightColor
    });
  }

  // Held piece on top, positioned at cursor
  if (board.heldBy && board.heldCursor) {
    const id = board.cells[board.heldPieceCell];
    if (id !== null && id !== undefined) {
      const px = area.x + board.heldCursor.x * area.w - cellW / 2;
      const py = area.y + board.heldCursor.y * area.h - cellH / 2;
      ctx.save();
      ctx.shadowColor = highlightColor;
      ctx.shadowBlur = 30;
      drawPiece(ctx, pieces[id], { x: px, y: py, w: cellW * 1.08, h: cellH * 1.08 }, {
        isCorrect: false,
        isSlidable: true,
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
  opts: { isCorrect: boolean; isSlidable: boolean; highlightColor: string; lifted?: boolean }
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
  } else if (opts.isSlidable) {
    ctx.strokeStyle = opts.highlightColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = opts.highlightColor;
    ctx.shadowBlur = 8;
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
  }
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.restore();
}
