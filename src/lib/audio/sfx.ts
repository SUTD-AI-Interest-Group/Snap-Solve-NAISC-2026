import { SFX_FILES, type SfxName } from './assets';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const buffers = new Map<SfxName, AudioBuffer>();
let muted = false;
let master = 1;

function applyGain() {
  if (masterGain) masterGain.gain.value = muted ? 0 : master;
}

export async function preloadSfx(): Promise<void> {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    applyGain();
  }
  await Promise.all(
    (Object.keys(SFX_FILES) as SfxName[]).map(async (name) => {
      try {
        const res = await fetch(SFX_FILES[name]);
        const ab = await res.arrayBuffer();
        if (ab.byteLength === 0) return;
        const buf = await ctx!.decodeAudioData(ab);
        buffers.set(name, buf);
      } catch (e) {
        console.warn(`SFX load failed for ${name}:`, e);
      }
    })
  );
}

export function playSfx(name: SfxName): void {
  if (muted || !ctx || !masterGain) return;
  const buf = buffers.get(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(masterGain);
  src.start();
}

export function setSfxMuted(v: boolean) {
  muted = v;
  applyGain();
}

/** Set the master volume level (0–1). */
export function setSfxVolume(level: number) {
  master = level;
  applyGain();
}
