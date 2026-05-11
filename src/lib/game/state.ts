import type { Point, Rect } from '../vision/types';
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
      autoCountdownMs: number | null;
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
  | { type: 'tick'; dtMs: number };

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
