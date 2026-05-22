import { beforeEach, describe, expect, it } from 'vitest';
import { loadCameraId, saveCameraId } from '../../src/lib/vision/cameraStorage';

// Minimal in-memory localStorage — the node test env has no DOM.
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v))
  };
}

describe('cameraStorage', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = makeStorage();
  });

  it('returns null when nothing stored', () => {
    expect(loadCameraId()).toBeNull();
  });

  it('round-trips a saved deviceId', () => {
    saveCameraId('cam-123');
    expect(loadCameraId()).toBe('cam-123');
  });

  it('clears the stored id when saving null', () => {
    saveCameraId('cam-123');
    saveCameraId(null);
    expect(loadCameraId()).toBeNull();
  });

  it('treats an empty string as no selection', () => {
    saveCameraId('');
    expect(loadCameraId()).toBeNull();
  });

  it('does not throw when localStorage is unavailable', () => {
    (globalThis as any).localStorage = undefined;
    expect(() => saveCameraId('x')).not.toThrow();
    expect(loadCameraId()).toBeNull();
  });
});
