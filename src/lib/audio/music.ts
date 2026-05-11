import { MUSIC_FILES, type MusicName } from './assets';

let current: HTMLAudioElement | null = null;
let currentName: MusicName | null = null;
let muted = false;
const DEFAULT_VOL = 0.35;

export function playMusic(name: MusicName, volume = DEFAULT_VOL) {
  if (currentName === name) return;
  stopMusic();
  const a = new Audio(MUSIC_FILES[name]);
  a.loop = true;
  a.volume = muted ? 0 : volume;
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
  if (current) current.volume = v ? 0 : DEFAULT_VOL;
}
