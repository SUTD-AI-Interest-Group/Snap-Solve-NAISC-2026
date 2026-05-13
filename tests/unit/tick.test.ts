import { describe, it, expect } from 'vitest';
import { tick } from '../../src/lib/game/tick';
import {
  initialState,
  EMPTY_GESTURES,
  type GameState,
  type GestureSnapshot
} from '../../src/lib/game/state';
import { makeSolvedBoard, swap as bSwap } from '../../src/lib/game/board';

function bothHands(
  p1xL: number,
  p1xR: number,
  p2xL: number,
  p2xR: number,
  pinch: 'idle' | 'pinching' | 'holding' = 'idle'
): GestureSnapshot {
  return {
    p1: {
      left: { present: true, pinch, cursor: { x: p1xL, y: 0.5 } },
      right: { present: true, pinch, cursor: { x: p1xR, y: 0.5 } }
    },
    p2: {
      left: { present: true, pinch, cursor: { x: p2xL, y: 0.5 } },
      right: { present: true, pinch, cursor: { x: p2xR, y: 0.5 } }
    }
  };
}

describe('tick - splash', () => {
  it('stays in splash without advanceFromSplash', () => {
    const s = tick(initialState, { type: 'tick', dtMs: 16 }, EMPTY_GESTURES);
    expect(s.phase).toBe('splash');
  });

  it('advances to nicknames', () => {
    const s = tick(initialState, { type: 'advanceFromSplash' }, EMPTY_GESTURES);
    expect(s.phase).toBe('nicknames');
  });
});

describe('tick - nicknames', () => {
  it('advances to trackingCheck on submission', () => {
    const s0: GameState = { phase: 'nicknames', p1Name: '', p2Name: '' };
    const s = tick(s0, { type: 'nicknamesSubmitted', p1Name: 'A', p2Name: 'B' }, EMPTY_GESTURES);
    expect(s.phase).toBe('trackingCheck');
    if (s.phase === 'trackingCheck') {
      expect(s.p1Name).toBe('A');
      expect(s.p2Name).toBe('B');
    }
  });
});

describe('tick - trackingCheck readiness', () => {
  it('accumulates readiness when both hands present', () => {
    const g = bothHands(0.2, 0.3, 0.7, 0.8);
    const s0: GameState = {
      phase: 'trackingCheck',
      p1Name: 'A',
      p2Name: 'B',
      p1Ready: 0,
      p2Ready: 0,
      autoCountdownMs: null
    };
    const s = tick(s0, { type: 'tick', dtMs: 500 }, g);
    expect(s.phase).toBe('trackingCheck');
    if (s.phase === 'trackingCheck') {
      expect(s.p1Ready).toBeGreaterThan(0);
      expect(s.p2Ready).toBeGreaterThan(0);
    }
  });

  it('resets readiness when hands disappear', () => {
    const s0: GameState = {
      phase: 'trackingCheck',
      p1Name: 'A',
      p2Name: 'B',
      p1Ready: 1000,
      p2Ready: 500,
      autoCountdownMs: null
    };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, EMPTY_GESTURES);
    if (s.phase === 'trackingCheck') {
      expect(s.p1Ready).toBe(0);
      expect(s.p2Ready).toBe(0);
    }
  });

  it('transitions to snip after the auto-countdown elapses', () => {
    const g = bothHands(0.2, 0.3, 0.7, 0.8);
    let s: GameState = {
      phase: 'trackingCheck',
      p1Name: 'A',
      p2Name: 'B',
      p1Ready: 0,
      p2Ready: 0,
      autoCountdownMs: null
    };
    // Need ~5 seconds total: 2s for readiness + 3s auto-countdown.
    for (let i = 0; i < 30; i++) s = tick(s, { type: 'tick', dtMs: 200 }, g);
    expect(s.phase).toBe('snip');
  });
});

describe('tick - snip', () => {
  it('enters framing when one hand holds', () => {
    const g: GestureSnapshot = {
      p1: {
        left: { present: true, pinch: 'holding', cursor: { x: 0.1, y: 0.2 } },
        right: { present: true, pinch: 'idle', cursor: { x: 0.4, y: 0.5 } }
      },
      p2: {
        left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      }
    };
    const s0: GameState = {
      phase: 'snip',
      p1Name: 'A',
      p2Name: 'B',
      p1: { kind: 'idle' },
      p2: { kind: 'idle' }
    };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'snip' && s.p1.kind === 'framing') {
      expect(s.p1.corner1).toEqual({ x: 0.1, y: 0.2 });
      expect(s.p1.corner2).toBeNull();
    } else {
      throw new Error('expected framing');
    }
  });

  it('locks the snip after both hands hold for 1500 ms over a large enough rect', () => {
    const g: GestureSnapshot = {
      p1: {
        left: { present: true, pinch: 'holding', cursor: { x: 0.05, y: 0.1 } },
        right: { present: true, pinch: 'holding', cursor: { x: 0.45, y: 0.9 } }
      },
      p2: {
        left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      }
    };
    let s: GameState = {
      phase: 'snip',
      p1Name: 'A',
      p2Name: 'B',
      p1: {
        kind: 'framing',
        corner1: { x: 0.05, y: 0.1 },
        corner2: { x: 0.45, y: 0.9 },
        holdMs: 1499
      },
      p2: { kind: 'idle' }
    };
    s = tick(s, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'snip') {
      expect(s.p1.kind).toBe('locked');
    } else {
      throw new Error('expected snip phase');
    }
  });
});

describe('tick - countdown', () => {
  it('counts down by dtMs and transitions to solve when it reaches 0', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    let s: GameState = { phase: 'countdown', remainingMs: 100, p1: stub, p2: stub };
    s = tick(s, { type: 'tick', dtMs: 200 }, EMPTY_GESTURES);
    expect(s.phase).toBe('solve');
    if (s.phase === 'solve') {
      expect(s.remainingMs).toBe(5 * 60 * 1000);
    }
  });
});

describe('tick - solve', () => {
  it('declares p1 as winner when p1.board is solved', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    const s0: GameState = {
      phase: 'solve',
      remainingMs: 60_000,
      startMs: 300_000,
      p1: { ...stub, board: makeSolvedBoard() },
      p2: { ...stub, board: bSwap(makeSolvedBoard(), 0, 1) }
    };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, EMPTY_GESTURES);
    expect(s.phase).toBe('result');
    if (s.phase === 'result') expect(s.winner).toBe('p1');
  });

  it('on timeout, higher correctCount wins', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    const p1Board = bSwap(makeSolvedBoard(), 0, 1); // 7 correct
    const p2Board = bSwap(bSwap(makeSolvedBoard(), 0, 1), 2, 3); // 5 correct
    const s0: GameState = {
      phase: 'solve',
      remainingMs: 16,
      startMs: 300_000,
      p1: { ...stub, board: p1Board },
      p2: { ...stub, board: p2Board }
    };
    const s = tick(s0, { type: 'tick', dtMs: 32 }, EMPTY_GESTURES);
    expect(s.phase).toBe('result');
  });
});

describe('tick - solve drag/drop', () => {
  // Player board areas (must match tick.ts): P1 = (0.06, 0.18, 0.38, 0.74), P2 = (0.56, 0.18, 0.38, 0.74).
  function imageCursorOverCell(cell: number, player: 'p1' | 'p2') {
    const r = Math.floor(cell / 3);
    const c = cell % 3;
    const localX = (c + 0.5) / 3;
    const localY = (r + 0.5) / 3;
    const a =
      player === 'p1'
        ? { x: 0.06, y: 0.18, w: 0.38, h: 0.74 }
        : { x: 0.56, y: 0.18, w: 0.38, h: 0.74 };
    return { x: a.x + localX * a.w, y: a.y + localY * a.h };
  }
  function boardLocalAtCell(cell: number) {
    const r = Math.floor(cell / 3);
    const c = cell % 3;
    return { x: (c + 0.5) / 3, y: (r + 0.5) / 3 };
  }

  it('pinching over any piece lifts it (no adjacency required)', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    const s0: GameState = {
      phase: 'solve',
      remainingMs: 60000,
      startMs: 300_000,
      p1: { ...stub, board: bSwap(makeSolvedBoard(), 0, 1) },
      p2: { ...stub, board: bSwap(makeSolvedBoard(), 0, 1) }
    };
    const g: GestureSnapshot = {
      p1: {
        left: { present: true, pinch: 'holding', cursor: imageCursorOverCell(0, 'p1') },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      },
      p2: {
        left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      }
    };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'solve') {
      expect(s.p1.board.heldBy).toBe('p1');
      expect(s.p1.board.heldPieceCell).toBe(0);
    } else {
      throw new Error('expected solve phase');
    }
  });

  it('releasing pinch over a different cell swaps the two pieces', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    const board = makeSolvedBoard();
    board.heldBy = 'p1';
    board.heldPieceCell = 0;
    board.heldCursor = boardLocalAtCell(8);

    const s0: GameState = {
      phase: 'solve',
      remainingMs: 60000,
      startMs: 300_000,
      p1: { ...stub, board },
      p2: { ...stub, board: bSwap(makeSolvedBoard(), 0, 1) }
    };
    const g: GestureSnapshot = {
      p1: {
        left: { present: true, pinch: 'idle', cursor: imageCursorOverCell(8, 'p1') },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      },
      p2: {
        left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      }
    };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'solve') {
      expect(s.p1.board.cells[0]).toBe(8);
      expect(s.p1.board.cells[8]).toBe(0);
      expect(s.p1.board.heldBy).toBeNull();
      expect(s.p1.board.heldPieceCell).toBe(-1);
      expect(s.p1.board.heldCursor).toBeNull();
    } else {
      throw new Error('expected solve phase');
    }
  });

  it('releasing pinch back over the origin cell cancels (no swap)', () => {
    const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };
    const board = bSwap(makeSolvedBoard(), 0, 1);
    board.heldBy = 'p1';
    board.heldPieceCell = 4;
    board.heldCursor = boardLocalAtCell(4);

    const s0: GameState = {
      phase: 'solve',
      remainingMs: 60000,
      startMs: 300_000,
      p1: { ...stub, board },
      p2: { ...stub, board: bSwap(makeSolvedBoard(), 0, 1) }
    };
    const g: GestureSnapshot = {
      p1: {
        left: { present: true, pinch: 'idle', cursor: imageCursorOverCell(4, 'p1') },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      },
      p2: {
        left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      }
    };
    const s = tick(s0, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'solve') {
      expect(s.p1.board.cells).toEqual([1, 0, 2, 3, 4, 5, 6, 7, 8]);
      expect(s.p1.board.heldBy).toBeNull();
    } else {
      throw new Error('expected solve phase');
    }
  });
});
