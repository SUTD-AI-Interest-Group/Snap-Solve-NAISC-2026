import { describe, it, expect } from 'vitest';
import { tick } from '../../src/lib/game/tick';
import {
  initialState,
  EMPTY_GESTURES,
  type GameState,
  type GestureSnapshot,
  type HighlightEvent
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
    const { state: s } = tick(initialState, { type: 'tick', dtMs: 16 }, EMPTY_GESTURES);
    expect(s.phase).toBe('splash');
  });

  it('advances to nicknames', () => {
    const { state: s } = tick(initialState, { type: 'advanceFromSplash' }, EMPTY_GESTURES);
    expect(s.phase).toBe('nicknames');
  });
});

describe('tick - nicknames', () => {
  it('advances to trackingCheck on submission', () => {
    const s0: GameState = { phase: 'nicknames', p1Name: '', p2Name: '' };
    const { state: s } = tick(s0, { type: 'nicknamesSubmitted', p1Name: 'A', p2Name: 'B' }, EMPTY_GESTURES);
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
    const { state: s } = tick(s0, { type: 'tick', dtMs: 500 }, g);
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
    const { state: s } = tick(s0, { type: 'tick', dtMs: 16 }, EMPTY_GESTURES);
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
    for (let i = 0; i < 30; i++) s = tick(s, { type: 'tick', dtMs: 200 }, g).state;
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
    const { state: s } = tick(s0, { type: 'tick', dtMs: 16 }, g);
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
    s = tick(s, { type: 'tick', dtMs: 16 }, g).state;
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
    s = tick(s, { type: 'tick', dtMs: 200 }, EMPTY_GESTURES).state;
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
    const { state: s } = tick(s0, { type: 'tick', dtMs: 16 }, EMPTY_GESTURES);
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
    const { state: s } = tick(s0, { type: 'tick', dtMs: 32 }, EMPTY_GESTURES);
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
    const { state: s } = tick(s0, { type: 'tick', dtMs: 16 }, g);
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
    const { state: s } = tick(s0, { type: 'tick', dtMs: 16 }, g);
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
    const { state: s } = tick(s0, { type: 'tick', dtMs: 16 }, g);
    if (s.phase === 'solve') {
      expect(s.p1.board.cells).toEqual([1, 0, 2, 3, 4, 5, 6, 7, 8]);
      expect(s.p1.board.heldBy).toBeNull();
    } else {
      throw new Error('expected solve phase');
    }
  });
});

describe('tick - highlights events', () => {
  const stub = { name: 'X', snip: undefined as unknown as ImageBitmap, pieces: [] };

  // Helper: image-coord cursor at the centre of a board cell.
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

  it('returns { state, events } shape', () => {
    const result = tick(initialState, { type: 'tick', dtMs: 16 }, EMPTY_GESTURES);
    expect(result.state).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('emits swap event on p1 successful drag', () => {
    // Build a solve state where p1 board has pieces 0 and 1 swapped (not solved).
    const scrambledBoard = bSwap(makeSolvedBoard(), 0, 1);
    const s0: GameState = {
      phase: 'solve',
      remainingMs: 60_000,
      startMs: 300_000,
      p1: { ...stub, board: scrambledBoard },
      p2: { ...stub, board: bSwap(makeSolvedBoard(), 0, 1) }
    };

    // Tick 1: p1 holds over cell 0 → lifts piece
    const holdCursor = imageCursorOverCell(0, 'p1');
    const g1: GestureSnapshot = {
      p1: {
        left: { present: true, pinch: 'holding', cursor: holdCursor },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      },
      p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
    };
    const r1 = tick(s0, { type: 'tick', dtMs: 16 }, g1);
    expect(r1.state.phase).toBe('solve');

    // Tick 2: p1 moves hand (still holding) to cell 1
    const moveCursor = imageCursorOverCell(1, 'p1');
    const g2: GestureSnapshot = {
      p1: {
        left: { present: true, pinch: 'holding', cursor: moveCursor },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      },
      p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
    };
    const r2 = tick(r1.state, { type: 'tick', dtMs: 16 }, g2);
    expect(r2.state.phase).toBe('solve');

    // Tick 3: p1 releases (pinch=idle) over cell 1 → swap fires
    const g3: GestureSnapshot = {
      p1: {
        left: { present: true, pinch: 'idle', cursor: moveCursor },
        right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }
      },
      p2: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
    };
    const r3 = tick(r2.state, { type: 'tick', dtMs: 16 }, g3);
    const swapEvent = r3.events.find((e): e is Extract<HighlightEvent, { kind: 'swap' }> => e.kind === 'swap');
    expect(swapEvent).toBeDefined();
    expect(swapEvent?.player).toBe('p1');
  });

  it('emits win event when p1 reaches correctCount=9', () => {
    const s0: GameState = {
      phase: 'solve',
      remainingMs: 60_000,
      startMs: 300_000,
      p1: { ...stub, board: makeSolvedBoard() },
      p2: { ...stub, board: bSwap(makeSolvedBoard(), 0, 1) }
    };
    const result = tick(s0, { type: 'tick', dtMs: 16 }, EMPTY_GESTURES);
    const winEvent = result.events.find((e): e is Extract<HighlightEvent, { kind: 'win' }> => e.kind === 'win');
    expect(winEvent).toBeDefined();
    expect(winEvent?.player).toBe('p1');
    expect(result.state.phase).toBe('result');
  });

  it('emits leadFlip when p2 overtakes p1', () => {
    // Set up state where p1 is ALREADY leading (7 correct vs 5) so the lead
    // is established before the tick. Then we need to fake a swap that puts
    // p2 ahead. We do that by pre-setting heldBy on p2's board so the release
    // triggers a swap that increases p2's count past p1's.

    // p1 board: 7 correct (piece 0 and 1 swapped)
    const p1Board = bSwap(makeSolvedBoard(), 0, 1); // correctCount=7

    // p2 board: 5 correct (pieces 0,1,2,3 all disturbed — two swaps)
    // bSwap(makeSolvedBoard(), 0,1) = 7 correct; bSwap that result with 2,3 = 5 correct
    const p2BoardBase = bSwap(bSwap(makeSolvedBoard(), 0, 1), 2, 3); // correctCount=5

    // Give p2 a held piece over cell 0, heldCursor pointing at cell 2.
    // When released, pieces 0 and 2 are swapped:
    //   Before: cells=[1,0,3,2,4,5,6,7,8] correctCount=5
    //   After swapping cell0 (value=1) with cell2 (value=3):
    //     cells=[3,0,1,2,4,5,6,7,8] → correctCount stays 5 (none of 0,2 correct)
    // That won't push p2 ahead. We need a swap that makes correctCount > 7.
    // Build a board where p2 has correctCount=5, but a pending swap that brings
    // it to 8: start from solved, swap cell4 and cell5 to get 7 correct, then
    // set up hold to swap them back.
    const p2BoardForFlip = (() => {
      // Swap cells 4 and 5: correctCount = 7
      const b = bSwap(makeSolvedBoard(), 4, 5);
      // Now hold piece at cell 4 (which contains value 5), cursor at cell 5.
      // On release, swapping back gives correctCount=9, but we don't want p2 to win.
      // Instead use a board where p2 has correctCount=5 but swap goes to 7:
      // swap two wrong pairs: cells 0,1 and cells 2,3
      // board=[1,0,3,2,4,5,6,7,8] correctCount=5
      // hold cell2 (value=3) and heldCursor over cell3 (value=2):
      // after swap: [1,0,2,3,4,5,6,7,8] correctCount=7
      const b2 = bSwap(bSwap(makeSolvedBoard(), 0, 1), 2, 3); // correctCount=5
      const b3 = { ...b2, heldBy: 'p2' as const, heldPieceCell: 2, heldCursor: { x: (3 % 3 + 0.5) / 3, y: (Math.floor(3 / 3) + 0.5) / 3 } };
      return b3;
    })();

    // p1 leads (7 vs 5 before tick), p2 will get to 7 after swap.
    // 7 vs 7 means newSign=0 so no flip yet.
    // We need p2 to get to 8 in one tick to flip. Let's use a different setup:
    // p1Board: correctCount=6 (bSwap twice from solved: swap 0,1 and 6,7 → 6 correct)
    // p2Board: correctCount=3 but pending swap brings to 8.

    // Actually, the simplest approach: p1 has correctCount=5, p2 has correctCount=3
    // but p2's pending swap brings p2 to 8 (greater than 5).
    // Build p2 board: solved, then swap 4 pairs leaving correctCount=1... tricky.
    // Let's just build: p2 board = bSwap×3 from solved = small correctCount,
    // but with a held piece swap that ends at a high count.

    // Simplest: p1Board=7 correct, p2Board=5 correct with held swap that brings p2 to 8.
    // For p2 to go from 5 → 8 in one swap, we need a swap that fixes 3 wrong pieces
    // simultaneously — not possible with a single swap (a swap can fix at most 2).
    // Maximum gain per swap: 2 (if both positions are wrong and swapping puts both right).
    // So: p1=5 correct, p2=3 correct, pending swap on p2 brings p2 to 5... ties, no flip.

    // To get a lead flip we need: before tick p1 leads, after tick p2 leads.
    // That means p2's net gain must be > p1's current lead.
    // If p1=6, p2=4, and p2's swap gains +2 → p2=6, tie, no flip.
    // If p1=5, p2=3, and p2's swap gains +2 → p2=5, tie, no flip.
    // So we need p1 not to improve (no held piece) and p2 to jump past p1 from behind.
    // With max +2 per swap: if p1=4 correct and p2=2 correct with pending swap gaining +2
    // → p2=4, still tied.
    //
    // Conclusion: to produce a genuine lead flip in a single tick, we need to set up state
    // already mid-flip. We can do this by using TWO separate tick calls:
    // State A: p1 leads (p1=7, p2=5, p2 has no pending swap)
    // State B: tick on state A produces no flip (both boards unchanged, still p1 leads)
    // To flip: we need to manually construct a state where after applyPlayerHoldWithSignal
    // p2 has MORE than p1. The trick: set p2's heldCursor pointing at a cell that, when
    // released, causes p2 to gain 2 and surpass p1.
    // p1=5, p2=3+2=5 → tie, not a flip.
    // p1=5 no-op, p2 goes from 3→6: impossible in one swap (+2 max).
    //
    // Real scenario: p1=5, p2=4 with a +2 swap pending → p2=6 > p1=5 → FLIP!
    // Build p2 board with correctCount=4 and a valid swap that produces correctCount=6.
    // solved=[0,1,2,3,4,5,6,7,8] correctCount=9
    // swap 0,5: [5,1,2,3,4,0,6,7,8] correctCount=7 (cells 1,2,3,4,6,7,8 correct = 7)
    // swap 1,2: [5,2,1,3,4,0,6,7,8] correctCount=5
    // Pending swap: cells 1 and 2 → restores them → correctCount=7. But p1=5 vs p2=7 → flip!
    // Wait, we need p1 LEADING before tick (p1=7, p2=5) to flip to p2 leading after.
    //
    // Let's re-read the spec: prevSign compares state (before tick) boards.
    // State before tick: p1.board.correctCount=7, p2.board.correctCount=5 → prevSign=+1 (p1 leads)
    // After applying holds: p1 unchanged (no hold), p2's swap brings p2 to 7.
    // newSign = sign(7-7) = 0 → no flip (because newSign===0).
    //
    // We need newSign to be negative (p2 leads). So p2 must end up STRICTLY greater than p1.
    // p1=6, p2=4 with +3 gain... impossible. p1=5, p2=3 with +3... impossible.
    // p1=6, p2=5 with +2 gain → p2=7 > p1=6 → prevSign=+1, newSign=-1 → FLIP!
    //
    // Build: p1Board correctCount=6, p2Board correctCount=5 with pending swap gaining +2.
    // p1Board: swap cells 0,1 and cells 6,7 → [1,0,2,3,4,5,7,6,8] correctCount=5... hmm.
    // Let me count: cells=[1,0,2,3,4,5,7,6,8]:
    //   0: cells[0]=1 ≠ 0 ✗
    //   1: cells[1]=0 ≠ 1 ✗
    //   2: cells[2]=2 = 2 ✓
    //   3: cells[3]=3 = 3 ✓
    //   4: cells[4]=4 = 4 ✓
    //   5: cells[5]=5 = 5 ✓
    //   6: cells[6]=7 ≠ 6 ✗
    //   7: cells[7]=6 ≠ 7 ✗
    //   8: cells[8]=8 = 8 ✓
    // correctCount = 5. Not 6.
    //
    // p1Board correctCount=6: swap only one pair → bSwap(solved, 0,1) = correctCount=7
    // Actually bSwap swaps TWO positions. cells=[1,0,2,3,4,5,6,7,8]:
    //   0: 1≠0 ✗; 1: 0≠1 ✗; 2-8 all ✓ → correctCount=7.
    // To get exacty 6: I need 3 wrong cells. That requires swapping one element with
    // a non-adjacent wrong partner. swap(solved, 0, 2): cells=[2,1,0,3,4,5,6,7,8]
    //   0: 2≠0 ✗; 1: 1=1 ✓; 2: 0≠2 ✗; others ✓ → correctCount=7. Still 7!
    // swap(solved,0,3): cells=[3,1,2,0,4,5,6,7,8]
    //   0: 3≠0 ✗; 1,2: ✓; 3: 0≠3 ✗; 4-8: ✓ → correctCount=7.
    // Any single swap of two wrong cells gives correctCount=7 (9-2).
    // To get correctCount=6 we need 3 wrong. That can't come from a single swap
    // (a swap always displaces exactly 0 or 2 cells).
    // To get 3 wrong: start with 7 correct (1 swap) then make 1 more wrong:
    // swap a correct cell with a wrong cell. E.g., cells=[1,0,2,...] (7 correct),
    // now swap cell2 (correct, value=2) with cell0 (wrong, value=1):
    //   cells=[2,0,1,3,4,5,6,7,8] → 0: 2≠0✗; 1: 0≠1✗; 2: 1≠2✗; 3-8: ✓ → correctCount=6 ✓

    const p1BoardLeading = (() => {
      const b = bSwap(makeSolvedBoard(), 0, 1); // [1,0,2,...] correctCount=7
      return bSwap(b, 0, 2); // [2,0,1,3,...] correctCount=6
    })();
    expect(p1BoardLeading.correctCount).toBe(6);

    // p2Board: correctCount=5 with a pending swap of cells 0,2 that brings it to 7.
    // Start from solved, make cells 0,1,2 all wrong:
    // bSwap(solved,0,1) then bSwap(result,0,2):
    //   After bSwap(solved,0,1): [1,0,2,...] correctCount=7
    //   After bSwap([1,0,2,...],0,2): cells[0]=2,cells[2]=1 → [2,0,1,3,...] correctCount=5
    //     0: 2≠0✗; 1: 0≠1✗; 2: 1≠2✗; 3-8: ✓ → correctCount=6. Wait that's 6 wrong → 3 wrong cells → correctCount=6.
    //     Hmm same as p1Board.
    // Need p2Board correctCount=5. Need 4 wrong cells (2 swaps of disjoint pairs).
    // bSwap(solved,0,1) then bSwap(result,2,3): [1,0,3,2,4,5,6,7,8] correctCount=5:
    //   0:1≠0✗; 1:0≠1✗; 2:3≠2✗; 3:2≠3✗; 4-8: ✓ → 5 correct ✓

    const p2BoardPreFlip = (() => {
      const b = bSwap(bSwap(makeSolvedBoard(), 0, 1), 2, 3); // [1,0,3,2,4,5,6,7,8] correctCount=5
      // Hold piece at cell 0, heldCursor pointing at cell 1.
      // Swap(0,1): cells=[0,1,3,2,...] → 0:✓,1:✓,2:3≠2✗,3:2≠3✗ → correctCount=7
      const heldCursor = { x: (1 % 3 + 0.5) / 3, y: (Math.floor(1 / 3) + 0.5) / 3 };
      return { ...b, heldBy: 'p2' as const, heldPieceCell: 0, heldCursor };
    })();
    expect(p2BoardPreFlip.correctCount).toBe(5);

    // State before tick: p1=6, p2=5 → prevSign = sign(6-5) = +1 (p1 leads)
    const stateBeforeFlip: GameState = {
      phase: 'solve',
      remainingMs: 60_000,
      startMs: 300_000,
      p1: { ...stub, board: p1BoardLeading },
      p2: { ...stub, board: p2BoardPreFlip }
    };

    // Tick with p2 releasing (pinch=idle) — causes the swap
    const g: GestureSnapshot = {
      p1: { left: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } },
      p2: { left: { present: true, pinch: 'idle', cursor: { x: 0, y: 0 } }, right: { present: false, pinch: 'idle', cursor: { x: 0, y: 0 } } }
    };

    const result = tick(stateBeforeFlip, { type: 'tick', dtMs: 16 }, g);
    // After tick: p1=6, p2=7 → newSign = sign(6-7) = -1 → leadFlip!
    const flipEvent = result.events.find(
      (e): e is Extract<HighlightEvent, { kind: 'leadFlip' }> => e.kind === 'leadFlip'
    );
    expect(flipEvent).toBeDefined();
    expect(flipEvent?.leader).toBe('p2');
  });
});
