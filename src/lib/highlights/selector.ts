import type { HighlightEvent, Winner } from '$lib/game/state';
import type { PlayerId } from '$lib/vision/types';
import { HIGHLIGHTS_CONFIG } from '$lib/config';

export type HighlightKind = 'winning' | 'streak' | 'comeback';

export type HighlightWindow = {
  kind: HighlightKind;
  player: PlayerId;
  startMs: number; // recording-relative
  endMs: number;
  caption: string;
};

const WINNING_PRE_MS = 2500;
const WINNING_POST_MS = 500;
const STREAK_PRE_MS = 500;
const STREAK_POST_MS = 1500;
const COMEBACK_PRE_MS = 1500;
const COMEBACK_POST_MS = 1500;

const OVERLAP_SUPPRESS_FRACTION = 0.5;

export function selectHighlights(
  events: HighlightEvent[],
  startedAtMs: number,
  winner: Winner,
  p1Name: string,
  p2Name: string
): HighlightWindow[] {
  const nameOf = (p: PlayerId) => (p === 'p1' ? p1Name : p2Name);
  const rel = (tMs: number) => Math.max(0, tMs - startedAtMs);

  const candidates: HighlightWindow[] = [];

  // 1. Winning
  if (winner === 'p1' || winner === 'p2') {
    const winEv = events.find((e) => e.kind === 'win' && e.player === winner);
    if (winEv && winEv.kind === 'win') {
      const t = rel(winEv.tMs);
      candidates.push({
        kind: 'winning',
        player: winEv.player,
        startMs: Math.max(0, t - WINNING_PRE_MS),
        endMs: t + WINNING_POST_MS,
        caption: `${nameOf(winEv.player)} solves it!`
      });
    }
  }

  // 2. Streak — densest run of progress swaps in a sliding 5s window.
  const progressSwaps = events.filter(
    (e): e is HighlightEvent & { kind: 'swap' } =>
      e.kind === 'swap' && e.correctAfter > e.correctBefore
  );

  let bestStreak: { player: PlayerId; first: number; last: number; count: number } | null = null;
  for (let i = 0; i < progressSwaps.length; i++) {
    const head = progressSwaps[i];
    let count = 1;
    let lastTMs = head.tMs;
    for (let j = i + 1; j < progressSwaps.length; j++) {
      const tail = progressSwaps[j];
      if (tail.player !== head.player) continue;
      if (tail.tMs - head.tMs > HIGHLIGHTS_CONFIG.streakWindowMs) break;
      count += 1;
      lastTMs = tail.tMs;
    }
    if (count >= HIGHLIGHTS_CONFIG.streakMinSwaps) {
      if (!bestStreak || count > bestStreak.count) {
        bestStreak = { player: head.player, first: head.tMs, last: lastTMs, count };
      }
    }
  }
  if (bestStreak) {
    const startMs = Math.max(0, rel(bestStreak.first) - STREAK_PRE_MS);
    const endMs = rel(bestStreak.last) + STREAK_POST_MS;
    candidates.push({
      kind: 'streak',
      player: bestStreak.player,
      startMs,
      endMs,
      caption: `${nameOf(bestStreak.player)} on a ${bestStreak.count}-piece streak`
    });
  }

  // 3. Comeback — latest leadFlip wins.
  const flips = events.filter(
    (e): e is HighlightEvent & { kind: 'leadFlip' } => e.kind === 'leadFlip'
  );
  if (flips.length > 0) {
    const latest = flips[flips.length - 1];
    const t = rel(latest.tMs);
    candidates.push({
      kind: 'comeback',
      player: latest.leader,
      startMs: Math.max(0, t - COMEBACK_PRE_MS),
      endMs: t + COMEBACK_POST_MS,
      caption: `${nameOf(latest.leader)} takes the lead!`
    });
  }

  // De-duplicate overlapping highlights, preserve priority order.
  const priority: Record<HighlightKind, number> = { winning: 0, streak: 1, comeback: 2 };
  candidates.sort((a, b) => priority[a.kind] - priority[b.kind]);

  const kept: HighlightWindow[] = [];
  for (const c of candidates) {
    const overlapsKept = kept.some((k) => overlapFraction(c, k) > OVERLAP_SUPPRESS_FRACTION);
    if (overlapsKept) continue;
    kept.push(c);
    if (kept.length >= HIGHLIGHTS_CONFIG.maxHighlightsPerGame) break;
  }
  return kept;
}

function overlapFraction(a: HighlightWindow, b: HighlightWindow): number {
  const start = Math.max(a.startMs, b.startMs);
  const end = Math.min(a.endMs, b.endMs);
  if (end <= start) return 0;
  const overlap = end - start;
  const smaller = Math.min(a.endMs - a.startMs, b.endMs - b.startMs);
  return smaller === 0 ? 0 : overlap / smaller;
}
