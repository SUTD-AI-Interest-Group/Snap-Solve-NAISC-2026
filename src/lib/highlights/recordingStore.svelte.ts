import type { HighlightEvent, GameMeta } from '$lib/game/state';

export const lastRecording = $state<{
  blob: Blob | null;
  events: HighlightEvent[];
  startedAtMs: number | null;
  meta: GameMeta | null;
}>({ blob: null, events: [], startedAtMs: null, meta: null });

export function setLastRecording(
  blob: Blob,
  events: HighlightEvent[],
  startedAtMs: number,
  meta: GameMeta
): void {
  lastRecording.blob = blob;
  lastRecording.events = events;
  lastRecording.startedAtMs = startedAtMs;
  lastRecording.meta = meta;
}

export function clearLastRecording(): void {
  lastRecording.blob = null;
  lastRecording.events = [];
  lastRecording.startedAtMs = null;
  lastRecording.meta = null;
}
