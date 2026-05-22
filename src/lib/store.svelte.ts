import { initialState, type GameState } from './game/state';
import { getTopScores, type Score } from './db/leaderboard';
import { loadCameraId } from './vision/cameraStorage';

export const game = $state<{ state: GameState }>({ state: initialState });
export const muted = $state<{ value: boolean }>({ value: false });
export const paused = $state<{ value: boolean }>({ value: false });
export const leaderboard = $state<{ scores: Score[] }>({ scores: [] });

// Available cameras + the user's current pick. `selectedId` seeds from the
// last-used camera (localStorage); App.svelte owns the camera lifecycle and
// re-opens the webcam when this changes.
export const camera = $state<{ list: MediaDeviceInfo[]; selectedId: string | null }>({
  list: [],
  selectedId: loadCameraId()
});

export async function refreshLeaderboard() {
  try {
    leaderboard.scores = await getTopScores(5);
  } catch (e) {
    console.error('Failed to load leaderboard', e);
    leaderboard.scores = [];
  }
}
