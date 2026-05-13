import type { HighlightEvent } from '$lib/game/state';

// Per-match accumulator of HighlightEvent. Reset at countdown → solve
// transition; consumed when the pipeline runs at solve → result.

export const eventLog = $state<{
  events: HighlightEvent[];
  startedAtMs: number | null;
}>({
  events: [],
  startedAtMs: null
});

export function resetEventLog(startedAtMs: number): void {
  eventLog.events = [];
  eventLog.startedAtMs = startedAtMs;
}

export function pushEvents(events: HighlightEvent[]): void {
  if (events.length === 0) return;
  eventLog.events.push(...events);
}
