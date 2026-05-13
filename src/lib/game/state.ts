import type { PlayerId, Point, Rect } from '../vision/types';
import type { Board } from './board';

export type Winner = 'p1' | 'p2' | 'draw';

export type SnipState =
  | { kind: 'idle' }
  | { kind: 'framing'; corner1: Point; corner2: Point | null; holdMs: number }
  | { kind: 'locked'; rect: Rect; snapshot: ImageBitmap | null };

export type PlayerSetup = { name: string; snip: ImageBitmap; pieces: ImageBitmap[] };
export type PlayerGame = PlayerSetup & { board: Board };

export type GameState =
  | { phase: 'splash' }
  | { phase: 'nicknames'; p1Name: string; p2Name: string }
  | {
      phase: 'trackingCheck';
      p1Name: string;
      p2Name: string;
      p1Ready: number;
      p2Ready: number;
      bothStableMs: number | null;
    }
  | { phase: 'snip'; p1Name: string; p2Name: string; p1: SnipState; p2: SnipState }
  | { phase: 'countdown'; remainingMs: number; p1: PlayerSetup; p2: PlayerSetup }
  | {
      phase: 'solve';
      remainingMs: number;
      startMs: number;
      p1: PlayerGame;
      p2: PlayerGame;
      winner?: Winner;
    }
  | { phase: 'result'; winner: Winner; durationMs: number; p1: PlayerGame; p2: PlayerGame };

export const initialState: GameState = { phase: 'splash' };

export type GameEvent =
  | { type: 'advanceFromSplash' }
  | { type: 'nicknamesSubmitted'; p1Name: string; p2Name: string }
  | { type: 'snipsCaptured'; p1Setup: PlayerSetup; p2Setup: PlayerSetup }
  | { type: 'rematch' }
  | { type: 'newPlayers' }
  | { type: 'tick'; dtMs: number; tMs?: number };

export type HandGesture = {
  present: boolean;
  pinch: 'idle' | 'pinching' | 'holding';
  cursor: Point;
};

export type GestureSnapshot = {
  p1: { left: HandGesture; right: HandGesture };
  p2: { left: HandGesture; right: HandGesture };
};

export const EMPTY_HAND: HandGesture = {
  present: false,
  pinch: 'idle',
  cursor: { x: 0, y: 0 }
};

export const EMPTY_GESTURES: GestureSnapshot = {
  p1: { left: EMPTY_HAND, right: EMPTY_HAND },
  p2: { left: EMPTY_HAND, right: EMPTY_HAND }
};

// ─── Highlights ──────────────────────────────────────────────────────
// Events emitted by tick() during the solve phase, consumed by the
// highlights selector after the game ends.

export type HighlightEvent =
  | {
      kind: 'swap';
      player: PlayerId;
      from: number;
      to: number;
      correctBefore: number;
      correctAfter: number;
      tMs: number;
    }
  | { kind: 'win'; player: PlayerId; tMs: number }
  | {
      kind: 'leadFlip';
      leader: PlayerId;
      p1Correct: number;
      p2Correct: number;
      tMs: number;
    };

export type GameMeta = {
  p1Name: string;
  p2Name: string;
  winner: Winner;
  durationMs: number;
};
