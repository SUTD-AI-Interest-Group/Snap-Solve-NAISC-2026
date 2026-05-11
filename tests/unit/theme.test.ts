import { describe, expect, it } from 'vitest';
import { CANVAS_COLORS } from '../../src/lib/render/theme';

describe('CANVAS_COLORS', () => {
  it('exposes a P1 and P2 string', () => {
    expect(typeof CANVAS_COLORS.p1).toBe('string');
    expect(typeof CANVAS_COLORS.p2).toBe('string');
    expect(CANVAS_COLORS.p1).not.toEqual(CANVAS_COLORS.p2);
  });

  it('exposes board tint variants distinct from the hand tints', () => {
    expect(typeof CANVAS_COLORS.p1Board).toBe('string');
    expect(typeof CANVAS_COLORS.p2Board).toBe('string');
  });

  it('exposes a scrim color', () => {
    expect(typeof CANVAS_COLORS.scrim).toBe('string');
  });
});
