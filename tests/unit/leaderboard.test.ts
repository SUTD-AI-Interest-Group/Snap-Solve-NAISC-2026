import 'fake-indexeddb/auto';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import { beforeEach, describe, expect, it } from 'vitest';
import { recordWin, getTopScores, clearLeaderboard, _resetForTests } from '../../src/lib/db/leaderboard';

describe('leaderboard', () => {
  beforeEach(async () => {
    // fake-indexeddb persists across tests in the same module — reset.
    (globalThis as any).indexedDB = new FDBFactory();
    _resetForTests();
  });

  it('inserts a new name', async () => {
    const r = await recordWin('Alice', 30000);
    expect(r.improved).toBe(true);
    expect(r.rank).toBe(1);
    const top = await getTopScores(5);
    expect(top).toHaveLength(1);
    expect(top[0].name).toBe('Alice');
    expect(top[0].bestTimeMs).toBe(30000);
  });

  it('updates when a faster time comes in for the same name', async () => {
    await recordWin('Alice', 30000);
    const r = await recordWin('Alice', 25000);
    expect(r.improved).toBe(true);
    const top = await getTopScores(5);
    expect(top).toHaveLength(1);
    expect(top[0].bestTimeMs).toBe(25000);
  });

  it('does not update when a slower time comes in for the same name', async () => {
    await recordWin('Alice', 25000);
    const r = await recordWin('Alice', 30000);
    expect(r.improved).toBe(false);
    const top = await getTopScores(5);
    expect(top[0].bestTimeMs).toBe(25000);
  });

  it('treats case-insensitive names as the same player', async () => {
    await recordWin('alice', 30000);
    const r = await recordWin('Alice', 25000);
    expect(r.improved).toBe(true);
    const top = await getTopScores(5);
    expect(top).toHaveLength(1);
    // Latest casing wins (Alice replaces alice on update).
    expect(top[0].name).toBe('Alice');
  });

  it('trims whitespace from names', async () => {
    await recordWin('  Bob  ', 30000);
    await recordWin('Bob', 25000);
    const top = await getTopScores(5);
    expect(top).toHaveLength(1);
    expect(top[0].name).toBe('Bob');
  });

  it('no-ops when name is empty after trim', async () => {
    const r = await recordWin('   ', 30000);
    expect(r.improved).toBe(false);
    expect(r.rank).toBe(null);
    const top = await getTopScores(5);
    expect(top).toHaveLength(0);
  });

  it('returns at most `limit` rows sorted ascending', async () => {
    await recordWin('A', 50000);
    await recordWin('B', 10000);
    await recordWin('C', 30000);
    await recordWin('D', 20000);
    await recordWin('E', 40000);
    await recordWin('F', 60000);
    const top = await getTopScores(5);
    expect(top.map((s) => s.name)).toEqual(['B', 'D', 'C', 'E', 'A']);
  });

  it('computes correct rank for new entries', async () => {
    await recordWin('A', 50000);
    await recordWin('B', 10000);
    const r = await recordWin('C', 30000);
    expect(r.rank).toBe(2); // B (10s), C (30s), A (50s)
  });

  it('clearLeaderboard empties the store', async () => {
    await recordWin('A', 10000);
    await clearLeaderboard();
    const top = await getTopScores(5);
    expect(top).toHaveLength(0);
  });
});

describe('leaderboard v1 → v2 migration', () => {
  beforeEach(() => {
    (globalThis as any).indexedDB = new FDBFactory();
    _resetForTests();
  });

  it('collapses duplicate names from v1 schema to a single best-time row', async () => {
    // Seed a v1 database directly.
    await new Promise<void>((resolve, reject) => {
      const req = (globalThis as any).indexedDB.open('snap-solve-db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        const store = db.createObjectStore('leaderboard', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timeMs', 'timeMs', { unique: false });
      };
      req.onsuccess = () => {
        const tx = req.result.transaction('leaderboard', 'readwrite');
        const s = tx.objectStore('leaderboard');
        s.add({ name: 'Alice', timeMs: 30000, date: '2026-01-01T00:00:00Z' });
        s.add({ name: 'Alice', timeMs: 20000, date: '2026-01-02T00:00:00Z' });
        s.add({ name: 'Bob', timeMs: 25000, date: '2026-01-03T00:00:00Z' });
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    const top = await getTopScores(5);
    expect(top.map((s) => ({ name: s.name, t: s.bestTimeMs }))).toEqual([
      { name: 'Alice', t: 20000 },
      { name: 'Bob', t: 25000 }
    ]);
  });
});
