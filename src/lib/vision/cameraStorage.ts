const STORAGE_KEY = 'snap-solve:cameraId';

/** Read the last-used camera deviceId, or null if none stored / unavailable. */
export function loadCameraId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/** Persist the chosen camera deviceId. A null/empty id clears the stored value. */
export function saveCameraId(deviceId: string | null): void {
  try {
    if (deviceId) localStorage.setItem(STORAGE_KEY, deviceId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable (private mode, etc.) — persistence is best-effort.
  }
}
