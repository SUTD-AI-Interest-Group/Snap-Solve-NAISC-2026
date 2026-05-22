const STORAGE_KEY = 'snap-solve:volume';

/** Clamp an arbitrary value into the 0–1 master-volume range. */
export function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, Math.max(0, v));
}

/** Read the saved master volume (0–1), defaulting to full when unset. */
export function loadVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return 1;
    return clampVolume(parseFloat(raw));
  } catch {
    return 1;
  }
}

/** Persist the master volume (0–1). Best-effort. */
export function saveVolume(v: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(clampVolume(v)));
  } catch {
    // localStorage may be unavailable (private mode, etc.).
  }
}
