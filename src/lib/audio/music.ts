import { MUSIC_FILES, type MusicName } from './assets';

let current: HTMLAudioElement | null = null;
let currentName: MusicName | null = null;
let muted = false;
// Music sits below SFX in the mix; the master volume (0–1) scales this base.
const MUSIC_BASE = 0.35;
let master = 1;

function effectiveVolume(): number {
  return muted ? 0 : master * MUSIC_BASE;
}

export function playMusic(name: MusicName) {
  if (currentName === name) return;
  stopMusic();
  const a = new Audio(MUSIC_FILES[name]);
  a.loop = true;
  a.volume = effectiveVolume();
  a.play().catch((e) => console.warn('music play failed', e));
  current = a;
  currentName = name;
}

export function stopMusic() {
  current?.pause();
  current = null;
  currentName = null;
}

export function setMusicMuted(v: boolean) {
  muted = v;
  if (current) current.volume = effectiveVolume();
}

/** Set the master volume level (0–1). */
export function setMusicVolume(level: number) {
  master = level;
  if (current) current.volume = effectiveVolume();
}
