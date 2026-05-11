export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type Landmark = { x: number; y: number; z: number };

export type Hand = {
  landmarks: Landmark[];
  worldLandmarks?: Landmark[];
  confidence: number;
};

export type PlayerId = 'p1' | 'p2';

export type PlayerHands = {
  left: Hand | null;
  right: Hand | null;
};

export type Frame = {
  timestamp: number;
  fps: number;
  players: Record<PlayerId, PlayerHands>;
};

export type PieceId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_BASE: 5,
  INDEX_TIP: 8
} as const;
