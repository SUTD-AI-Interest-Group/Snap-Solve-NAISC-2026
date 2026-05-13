import { initialState, type GameState } from './game/state';
import { getTopScores, type Score } from './db/leaderboard';

export const game = $state<{ state: GameState }>({ state: initialState });
export const muted = $state<{ value: boolean }>({ value: false });
export const paused = $state<{ value: boolean }>({ value: false });
export const leaderboard = $state<{ scores: Score[] }>({ scores: [] });

export async function refreshLeaderboard() {
  try {
    leaderboard.scores = await getTopScores(5);
  } catch (e) {
    console.error('Failed to load leaderboard', e);
    leaderboard.scores = [];
  }
}
