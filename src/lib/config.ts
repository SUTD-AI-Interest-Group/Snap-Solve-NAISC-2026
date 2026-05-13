// Tunable constants for the highlights pipeline. Kept here so smoke-test
// adjustments don't require digging into individual modules.
export const HIGHLIGHTS_CONFIG = {
  recordingFps: 24,
  recordingBitrate: 1_500_000,
  gifWidth: 480,
  gifHeight: 270,
  gifFps: 12,
  maxHighlightsPerGame: 3,
  streakMinSwaps: 3,
  streakWindowMs: 5000,
  // gif.js encoder quality: lower = better, 1-30. 8 is a good balance.
  gifQuality: 8,
  // 4 parallel workers gets ~3-4s encoding for a 3-sec 480x270 clip.
  gifWorkers: 4
} as const;

export type HighlightsConfig = typeof HIGHLIGHTS_CONFIG;
