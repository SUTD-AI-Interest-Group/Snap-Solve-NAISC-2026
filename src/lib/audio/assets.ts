export const SFX_FILES = {
  pinch: '/audio/pinch.mp3',
  slide: '/audio/slide.mp3',
  countdownTick: '/audio/countdown-tick.mp3',
  countdownGo: '/audio/countdown-go.mp3',
  winFanfare: '/audio/win-fanfare.mp3',
  draw: '/audio/draw.mp3',
  timeup: '/audio/timeup.mp3'
} as const;

export const MUSIC_FILES = {
  lobby: '/audio/lobby-loop.mp3',
  gameplay: '/audio/gameplay-loop.mp3'
} as const;

export type SfxName = keyof typeof SFX_FILES;
export type MusicName = keyof typeof MUSIC_FILES;
