import type { Hand, PlayerHands, PlayerId } from '../vision/types';
import { LM } from '../vision/types';

function wristX(h: Hand): number {
  return h.landmarks[LM.WRIST].x;
}
function wristY(h: Hand): number {
  return h.landmarks[LM.WRIST].y;
}

function pickTwoMostCentral(hands: Hand[]): Hand[] {
  if (hands.length <= 2) return hands;
  return [...hands]
    .sort((a, b) => Math.abs(wristY(a) - 0.5) - Math.abs(wristY(b) - 0.5))
    .slice(0, 2);
}

function sortByX(hands: Hand[]): Hand[] {
  return [...hands].sort((a, b) => wristX(a) - wristX(b));
}

function pack(hands: Hand[]): PlayerHands {
  const sorted = sortByX(pickTwoMostCentral(hands));
  return { left: sorted[0] ?? null, right: sorted[1] ?? null };
}

export function assignHandsToPlayers(hands: Hand[]): Record<PlayerId, PlayerHands> {
  const p1Hands = hands.filter((h) => wristX(h) < 0.5);
  const p2Hands = hands.filter((h) => wristX(h) >= 0.5);
  return { p1: pack(p1Hands), p2: pack(p2Hands) };
}
