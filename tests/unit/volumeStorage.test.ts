import { beforeEach, describe, expect, it } from 'vitest';
import { loadVolume, saveVolume, clampVolume } from '../../src/lib/audio/volumeStorage';

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

describe('volumeStorage', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = makeStorage();
  });

  it('defaults to full volume when nothing stored', () => {
    expect(loadVolume()).toBe(1);
  });

  it('round-trips a saved level', () => {
    saveVolume(0.4);
    expect(loadVolume()).toBeCloseTo(0.4);
  });

  it('clamps out-of-range values', () => {
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-0.5)).toBe(0);
    expect(clampVolume(0.6)).toBeCloseTo(0.6);
  });

  it('falls back to full volume for non-finite input', () => {
    expect(clampVolume(NaN)).toBe(1);
  });

  it('clamps a stored value that is out of range on load', () => {
    localStorage.setItem('snap-solve:volume', '5');
    expect(loadVolume()).toBe(1);
  });

  it('does not throw when localStorage is unavailable', () => {
    (globalThis as any).localStorage = undefined;
    expect(() => saveVolume(0.5)).not.toThrow();
    expect(loadVolume()).toBe(1);
  });
});
