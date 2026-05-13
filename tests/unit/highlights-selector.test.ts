import { describe, it, expect } from 'vitest';
import { selectHighlights } from '../../src/lib/highlights/selector';
import type { HighlightEvent } from '../../src/lib/game/state';

const t0 = 100_000; // arbitrary recording start (absolute ms)

function withT(offsetMs: number): number {
  return t0 + offsetMs;
}

describe('selectHighlights', () => {
  it('returns empty array when there are no events', () => {
    const result = selectHighlights([], t0, 'draw', 'alice', 'bob');
    expect(result).toEqual([]);
  });

  it('emits a winning highlight when the winner has a win event', () => {
    const events: HighlightEvent[] = [{ kind: 'win', player: 'p1', tMs: withT(30_000) }];
    const result = selectHighlights(events, t0, 'p1', 'alice', 'bob');
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('winning');
    expect(result[0].player).toBe('p1');
    expect(result[0].startMs).toBe(27_500); // 30s - 2.5s
    expect(result[0].endMs).toBe(30_500); // 30s + 0.5s
    expect(result[0].caption).toBe('alice solves it!');
  });

  it('clamps the winning window to non-negative startMs', () => {
    const events: HighlightEvent[] = [{ kind: 'win', player: 'p2', tMs: withT(1_000) }];
    const result = selectHighlights(events, t0, 'p2', 'alice', 'bob');
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(1_500);
  });

  it('skips the winning highlight when winner is draw', () => {
    const events: HighlightEvent[] = [];
    const result = selectHighlights(events, t0, 'draw', 'alice', 'bob');
    expect(result).toEqual([]);
  });

  it('detects a streak of 3+ progress swaps within a 5s window', () => {
    const events: HighlightEvent[] = [
      // 3 progress swaps for p1 within ~3s.
      { kind: 'swap', player: 'p1', from: 0, to: 1, correctBefore: 0, correctAfter: 2, tMs: withT(10_000) },
      { kind: 'swap', player: 'p1', from: 1, to: 2, correctBefore: 2, correctAfter: 4, tMs: withT(11_500) },
      { kind: 'swap', player: 'p1', from: 2, to: 3, correctBefore: 4, correctAfter: 6, tMs: withT(12_800) }
    ];
    const result = selectHighlights(events, t0, 'draw', 'alice', 'bob');
    const streak = result.find((h) => h.kind === 'streak');
    expect(streak).toBeDefined();
    expect(streak!.player).toBe('p1');
    expect(streak!.startMs).toBe(9_500); // firstSwap - 0.5s
    expect(streak!.endMs).toBe(14_300); // lastSwap + 1.5s
    expect(streak!.caption).toContain('3');
  });

  it('ignores swaps that do not increase correctCount', () => {
    const events: HighlightEvent[] = [
      { kind: 'swap', player: 'p1', from: 0, to: 1, correctBefore: 2, correctAfter: 2, tMs: withT(10_000) },
      { kind: 'swap', player: 'p1', from: 1, to: 2, correctBefore: 2, correctAfter: 2, tMs: withT(11_000) },
      { kind: 'swap', player: 'p1', from: 2, to: 3, correctBefore: 2, correctAfter: 2, tMs: withT(12_000) }
    ];
    const result = selectHighlights(events, t0, 'draw', 'alice', 'bob');
    expect(result.find((h) => h.kind === 'streak')).toBeUndefined();
  });

  it('selects the latest leadFlip as the comeback', () => {
    const events: HighlightEvent[] = [
      { kind: 'leadFlip', leader: 'p1', p1Correct: 3, p2Correct: 2, tMs: withT(10_000) },
      { kind: 'leadFlip', leader: 'p2', p1Correct: 3, p2Correct: 4, tMs: withT(20_000) },
      { kind: 'leadFlip', leader: 'p1', p1Correct: 5, p2Correct: 4, tMs: withT(30_000) }
    ];
    const result = selectHighlights(events, t0, 'draw', 'alice', 'bob');
    const comeback = result.find((h) => h.kind === 'comeback');
    expect(comeback).toBeDefined();
    expect(comeback!.player).toBe('p1');
    expect(comeback!.startMs).toBe(28_500);
    expect(comeback!.endMs).toBe(31_500);
  });

  it('suppresses a streak that overlaps the winning window by >50%', () => {
    // win at 30s → window [27.5, 30.5]. Streak ending at 30s overlaps fully.
    const events: HighlightEvent[] = [
      { kind: 'swap', player: 'p1', from: 0, to: 1, correctBefore: 5, correctAfter: 7, tMs: withT(28_000) },
      { kind: 'swap', player: 'p1', from: 1, to: 2, correctBefore: 7, correctAfter: 8, tMs: withT(29_000) },
      { kind: 'swap', player: 'p1', from: 2, to: 3, correctBefore: 8, correctAfter: 9, tMs: withT(30_000) },
      { kind: 'win', player: 'p1', tMs: withT(30_000) }
    ];
    const result = selectHighlights(events, t0, 'p1', 'alice', 'bob');
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('winning');
  });

  it('returns at most 3 highlights', () => {
    const events: HighlightEvent[] = [
      { kind: 'win', player: 'p1', tMs: withT(50_000) },
      { kind: 'swap', player: 'p1', from: 0, to: 1, correctBefore: 0, correctAfter: 2, tMs: withT(10_000) },
      { kind: 'swap', player: 'p1', from: 1, to: 2, correctBefore: 2, correctAfter: 4, tMs: withT(11_000) },
      { kind: 'swap', player: 'p1', from: 2, to: 3, correctBefore: 4, correctAfter: 6, tMs: withT(12_000) },
      { kind: 'leadFlip', leader: 'p1', p1Correct: 4, p2Correct: 3, tMs: withT(20_000) }
    ];
    const result = selectHighlights(events, t0, 'p1', 'alice', 'bob');
    expect(result.length).toBeLessThanOrEqual(3);
  });
});
