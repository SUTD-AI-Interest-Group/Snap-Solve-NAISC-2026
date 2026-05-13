// src/lib/db/leaderboard.ts
export interface Score {
  id?: number;
  name: string;
  nameLower: string;
  bestTimeMs: number;
  updatedAt: string;
}

const DB_NAME = 'snap-solve-db';
const STORE_NAME = 'leaderboard';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

/** Test-only: forget the cached db handle so a fresh `indexedDB` can be picked up. */
export function _resetForTests() {
  dbPromise = null;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction!;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('bestTimeMs', 'bestTimeMs', { unique: false });
        store.createIndex('nameLower', 'nameLower', { unique: true });
        return;
      }

      if (oldVersion === 1) {
        // Migrate from v1: { id, name, timeMs, date }
        const store = tx.objectStore(STORE_NAME);
        // Try to drop the old timeMs index if it exists.
        try { store.deleteIndex('timeMs'); } catch { /* not present */ }
        store.createIndex('bestTimeMs', 'bestTimeMs', { unique: false });
        store.createIndex('nameLower', 'nameLower', { unique: true });

        // Read all old rows; dedup by lower(name) keeping min(timeMs).
        const all = store.getAll();
        all.onsuccess = () => {
          const rows = (all.result as Array<{ id: number; name: string; timeMs: number; date?: string }>);
          const byKey = new Map<string, { name: string; bestTimeMs: number; updatedAt: string }>();
          for (const r of rows) {
            const key = (r.name ?? '').trim().toLowerCase();
            if (!key) continue;
            const prior = byKey.get(key);
            if (!prior || r.timeMs < prior.bestTimeMs) {
              byKey.set(key, {
                name: r.name.trim(),
                bestTimeMs: r.timeMs,
                updatedAt: r.date ?? new Date().toISOString()
              });
            }
          }
          // Clear and re-insert.
          store.clear().onsuccess = () => {
            for (const [nameLower, v] of byKey) {
              store.add({ ...v, nameLower });
            }
          };
        };
      }
    };
  });
  return dbPromise;
}

function normalizeName(raw: string): { name: string; nameLower: string } | null {
  const name = (raw ?? '').trim();
  if (!name) return null;
  return { name, nameLower: name.toLowerCase() };
}

export async function recordWin(
  rawName: string,
  timeMs: number
): Promise<{ improved: boolean; rank: number | null }> {
  const norm = normalizeName(rawName);
  if (!norm) return { improved: false, rank: null };

  const db = await openDb();
  const improved = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index('nameLower');
    const lookup = idx.get(norm.nameLower);
    lookup.onsuccess = () => {
      const existing = lookup.result as Score | undefined;
      const now = new Date().toISOString();
      if (!existing) {
        store.add({ name: norm.name, nameLower: norm.nameLower, bestTimeMs: timeMs, updatedAt: now });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        return;
      }
      if (timeMs < existing.bestTimeMs) {
        store.put({
          id: existing.id,
          name: norm.name, // latest casing
          nameLower: norm.nameLower,
          bestTimeMs: timeMs,
          updatedAt: now
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        return;
      }
      tx.oncomplete = () => resolve(false);
      tx.onerror = () => reject(tx.error);
    };
    lookup.onerror = () => reject(lookup.error);
  });

  if (!improved) {
    // Still compute rank if the player exists.
    const all = await getTopScores(Infinity);
    const idx = all.findIndex((s) => s.nameLower === norm.nameLower);
    return { improved: false, rank: idx >= 0 ? idx + 1 : null };
  }

  const all = await getTopScores(Infinity);
  const idx = all.findIndex((s) => s.nameLower === norm.nameLower);
  return { improved: true, rank: idx >= 0 ? idx + 1 : null };
}

export async function getTopScores(limit = 5): Promise<Score[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index('bestTimeMs');
    const req = idx.getAll();
    req.onsuccess = () => {
      const rows = (req.result as Score[]).sort((a, b) => a.bestTimeMs - b.bestTimeMs);
      resolve(Number.isFinite(limit) ? rows.slice(0, limit) : rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearLeaderboard(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
