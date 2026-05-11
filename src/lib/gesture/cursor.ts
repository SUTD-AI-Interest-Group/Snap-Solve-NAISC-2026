import type { Hand, Point } from '../vision/types';
import { LM } from '../vision/types';

export function getCursorPoint(hand: Hand): Point {
  // Anchor the cursor on the index fingertip — that's what the player is
  // pointing with. When pinched the thumb meets the index tip anyway, so the
  // pickup/drop position is unchanged on a clean pinch.
  const i = hand.landmarks[LM.INDEX_TIP];
  return { x: i.x, y: i.y };
}
