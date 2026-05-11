import type { Point } from './types';

function alpha(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private prev: number | null = null;
  private prevD: number = 0;
  private lastTime: number | null = null;
  constructor(
    private minCutoff = 1.0,
    private beta = 0.01,
    private dCutoff = 1.0
  ) {}

  filter(value: number, tMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = tMs;
      this.prev = value;
      return value;
    }
    const dt = Math.max(1, tMs - this.lastTime) / 1000;
    this.lastTime = tMs;
    const dx = (value - (this.prev ?? value)) / dt;
    const aD = alpha(dt, this.dCutoff);
    const dxHat = aD * dx + (1 - aD) * this.prevD;
    this.prevD = dxHat;
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = alpha(dt, cutoff);
    const out = a * value + (1 - a) * (this.prev ?? value);
    this.prev = out;
    return out;
  }
}

export class OneEuroPointFilter {
  private fx = new OneEuroFilter();
  private fy = new OneEuroFilter();
  filter(p: Point, tMs: number): Point {
    return { x: this.fx.filter(p.x, tMs), y: this.fy.filter(p.y, tMs) };
  }
}
