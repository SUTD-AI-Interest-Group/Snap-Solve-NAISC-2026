// Canvas drawing colors. These mirror the CSS custom properties defined in
// src/app.css. The 2D canvas API can't read CSS variables, so this module is
// the single source of truth for the JS-side color literals. Keep in sync
// with the tokens in app.css if either changes.

export const CANVAS_COLORS = {
  // Player tints used for hand landmarks, snip-rect strokes, and cursors.
  p1: '#ff7733', // bright orange — matches --color-p1
  p2: '#3b8bff', // vivid blue — matches --color-p2
  // Lighter variants used as board tints / piece highlights during solve.
  p1Board: '#ffb066',
  p2Board: '#7fbcff',
  // Translucent dark scrim drawn over the live video for legibility.
  scrim: 'rgba(34, 27, 22, 0.4)' // ~oklch ink at 40% alpha
} as const;

export type CanvasColors = typeof CANVAS_COLORS;
