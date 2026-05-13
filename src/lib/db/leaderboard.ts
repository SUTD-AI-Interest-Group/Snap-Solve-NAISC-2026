export interface Score {
  id?: number;
  name: string;
  timeMs: number;
  date: string;
}

const DB_NAME = 'snap-solve-db';
const STORE_NAME = 'leaderboard';
const DB_VERSION = 1;

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timeMs', 'timeMs', { unique: false });
      }
    };
  });
}

export async function saveScore(name: string, timeMs: number): Promise<number> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const score: Score = {
      name,
      timeMs,
      date: new Date().toISOString()
    };
    
    const request = store.add(score);
    request.onsuccess = (e) => {
      resolve((e.target as IDBRequest).result as number);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getTopScores(limit = 10): Promise<Score[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timeMs');
    
    const request = index.getAll(); // Get all, then slice because cursors are verbose
    request.onsuccess = () => {
      // Sort by timeMs ascending, take top N
      const scores = (request.result as Score[])
        .sort((a, b) => a.timeMs - b.timeMs)
        .slice(0, limit);
      resolve(scores);
    };
    request.onerror = () => reject(request.error);
  });
}
