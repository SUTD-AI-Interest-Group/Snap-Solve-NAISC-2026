import { initialState, type GameState } from './game/state';

export const game = $state<{ state: GameState }>({ state: initialState });
export const muted = $state<{ value: boolean }>({ value: false });
export const paused = $state<{ value: boolean }>({ value: false });
