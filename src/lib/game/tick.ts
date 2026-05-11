import type {
  GameState,
  GameEvent,
  GestureSnapshot,
  HandGesture,
  SnipState,
  Winner
} from './state';
import type { PlayerId, Point } from '../vision/types';
import type { Board } from './board';
import {
  isAdjacentToEmpty,
  slide as boardSlide,
  scrambleByRandomMoves,
  makeSolvedBoard
} from './board';
import { rectFromCorners, clampToPlayerHalf, hasMinSize } from './snip';

const READY_HOLD_TARGET_MS = 2000;
const AUTO_COUNTDOWN_MS = 3000;
const SNIP_HOLD_MS = 1500;
const SOLVE_DURATION_MS = 5 * 60 * 1000;

function bothHandsPresent(p: { left: HandGesture; right: HandGesture }): boolean {
  return p.left.present && p.right.present;
}

function nextSnipState(
  prev: SnipState,
  hands: { left: HandGesture; right: HandGesture },
  player: PlayerId,
  dt: number
): SnipState {
  if (prev.kind === 'locked') return prev;

  const leftHold = hands.left.present && hands.left.pinch === 'holding';
  const rightHold = hands.right.present && hands.right.pinch === 'holding';
  const leftCursor = clampToPlayerHalf(hands.left.cursor, player);
  const rightCursor = clampToPlayerHalf(hands.right.cursor, player);

  if (leftHold && rightHold) {
    const rect = rectFromCorners(leftCursor, rightCursor);
    const okSize = hasMinSize(rect, 1280, 720);
    const holdMs = (prev.kind === 'framing' ? prev.holdMs : 0) + dt;
    if (okSize && holdMs >= SNIP_HOLD_MS) {
      return { kind: 'locked', rect, snapshot: null };
    }
    return { kind: 'framing', corner1: leftCursor, corner2: rightCursor, holdMs };
  }
  if (leftHold) return { kind: 'framing', corner1: leftCursor, corner2: null, holdMs: 0 };
  if (rightHold) return { kind: 'framing', corner1: rightCursor, corner2: null, holdMs: 0 };
  return { kind: 'idle' };
}

function boardCellAt(p: Point): number {
  const col = Math.max(0, Math.min(2, Math.floor(p.x * 3)));
  const row = Math.max(0, Math.min(2, Math.floor(p.y * 3)));
  return row * 3 + col;
}

function applyPlayerHold(
  board: Board,
  player: PlayerId,
  hands: { left: HandGesture; right: HandGesture }
): Board {
  const active =
    hands.left.present && hands.left.pinch === 'holding'
      ? hands.left
      : hands.right.present && hands.right.pinch === 'holding'
        ? hands.right
        : null;

  if (active) {
    const cell = boardCellAt(active.cursor);
    if (board.heldBy === player) {
      return { ...board, heldCursor: active.cursor };
    }
    if (isAdjacentToEmpty(board, cell)) {
      return { ...board, heldBy: player, heldPieceCell: cell, heldCursor: active.cursor };
    }
    return board;
  }

  if (board.heldBy === player) {
    const dropCell = boardCellAt(board.heldCursor ?? { x: 0, y: 0 });
    const src = board.heldPieceCell;
    const valid = dropCell === board.emptyIndex && isAdjacentToEmpty(board, src);
    if (valid) {
      return boardSlide(board, src);
    }
    return { ...board, heldBy: null, heldPieceCell: -1, heldCursor: null };
  }
  return board;
}

export function tick(state: GameState, event: GameEvent, gestures: GestureSnapshot): GameState {
  if (event.type === 'newPlayers') return { phase: 'nicknames', p1Name: '', p2Name: '' };
  if (event.type === 'rematch' && state.phase === 'result') {
    return {
      phase: 'trackingCheck',
      p1Name: state.p1.name,
      p2Name: state.p2.name,
      p1Ready: 0,
      p2Ready: 0,
      autoCountdownMs: null
    };
  }

  switch (state.phase) {
    case 'splash':
      if (event.type === 'advanceFromSplash') return { phase: 'nicknames', p1Name: '', p2Name: '' };
      return state;

    case 'nicknames':
      if (event.type === 'nicknamesSubmitted') {
        return {
          phase: 'trackingCheck',
          p1Name: event.p1Name,
          p2Name: event.p2Name,
          p1Ready: 0,
          p2Ready: 0,
          autoCountdownMs: null
        };
      }
      return state;

    case 'trackingCheck': {
      if (event.type !== 'tick') return state;
      const dt = event.dtMs;
      const p1Ok = bothHandsPresent(gestures.p1);
      const p2Ok = bothHandsPresent(gestures.p2);
      const p1Ready = p1Ok ? Math.min(READY_HOLD_TARGET_MS, state.p1Ready + dt) : 0;
      const p2Ready = p2Ok ? Math.min(READY_HOLD_TARGET_MS, state.p2Ready + dt) : 0;
      const bothFull = p1Ready >= READY_HOLD_TARGET_MS && p2Ready >= READY_HOLD_TARGET_MS;

      if (bothFull) {
        const remaining = (state.autoCountdownMs ?? AUTO_COUNTDOWN_MS) - dt;
        if (remaining <= 0) {
          return {
            phase: 'snip',
            p1Name: state.p1Name,
            p2Name: state.p2Name,
            p1: { kind: 'idle' },
            p2: { kind: 'idle' }
          };
        }
        return { ...state, p1Ready, p2Ready, autoCountdownMs: remaining };
      }
      return { ...state, p1Ready, p2Ready, autoCountdownMs: null };
    }

    case 'snip': {
      if (event.type === 'snipsCaptured') {
        return {
          phase: 'countdown',
          remainingMs: 5000,
          p1: event.p1Setup,
          p2: event.p2Setup
        };
      }
      if (event.type !== 'tick') return state;
      const dt = event.dtMs;
      const p1 = nextSnipState(state.p1, gestures.p1, 'p1', dt);
      const p2 = nextSnipState(state.p2, gestures.p2, 'p2', dt);
      return { ...state, p1, p2 };
    }

    case 'countdown': {
      if (event.type !== 'tick') return state;
      const remaining = state.remainingMs - event.dtMs;
      if (remaining > 0) return { ...state, remainingMs: remaining };
      const p1Board = scrambleByRandomMoves(80);
      const p2Board = scrambleByRandomMoves(80);
      return {
        phase: 'solve',
        remainingMs: SOLVE_DURATION_MS,
        startMs: SOLVE_DURATION_MS,
        p1: { ...state.p1, board: p1Board },
        p2: { ...state.p2, board: p2Board }
      };
    }

    case 'solve': {
      if (event.type !== 'tick') return state;
      const dt = event.dtMs;
      const p1Board = applyPlayerHold(state.p1.board, 'p1', gestures.p1);
      const p2Board = applyPlayerHold(state.p2.board, 'p2', gestures.p2);
      const p1 = { ...state.p1, board: p1Board };
      const p2 = { ...state.p2, board: p2Board };

      const p1Won = p1Board.correctCount === 8 && p1Board.cells[8] === null;
      const p2Won = p2Board.correctCount === 8 && p2Board.cells[8] === null;
      if (p1Won)
        return {
          phase: 'result',
          winner: 'p1',
          durationMs: state.startMs - state.remainingMs,
          p1,
          p2
        };
      if (p2Won)
        return {
          phase: 'result',
          winner: 'p2',
          durationMs: state.startMs - state.remainingMs,
          p1,
          p2
        };

      const remaining = state.remainingMs - dt;
      if (remaining <= 0) {
        const winner: Winner =
          p1Board.correctCount > p2Board.correctCount
            ? 'p1'
            : p2Board.correctCount > p1Board.correctCount
              ? 'p2'
              : 'draw';
        return { phase: 'result', winner, durationMs: state.startMs, p1, p2 };
      }
      return { ...state, remainingMs: remaining, p1, p2 };
    }

    case 'result':
      return state;
  }
}
