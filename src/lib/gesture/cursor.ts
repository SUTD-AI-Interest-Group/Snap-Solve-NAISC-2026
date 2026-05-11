import type { Hand, Point } from '../vision/types';
import { LM } from '../vision/types';

export function getCursorPoint(hand: Hand): Point {
  const t = hand.landmarks[LM.THUMB_TIP];
  const i = hand.landmarks[LM.INDEX_TIP];
  return { x: (t.x + i.x) / 2, y: (t.y + i.y) / 2 };
}
