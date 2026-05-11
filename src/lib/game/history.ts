import type { Winner } from './state';

export type GameResult = {
  p1Name: string;
  p2Name: string;
  winner: Winner;
  durationMs: number;
  timestamp: number;
};

export const gameHistory: GameResult[] = [];

export function pushResult(r: GameResult) {
  gameHistory.push(r);
}
