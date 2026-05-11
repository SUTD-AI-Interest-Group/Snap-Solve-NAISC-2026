import { SFX_FILES, type SfxName } from './assets';

let ctx: AudioContext | null = null;
const buffers = new Map<SfxName, AudioBuffer>();
let muted = false;

export async function preloadSfx(): Promise<void> {
  ctx ??= new AudioContext();
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
  if (muted || !ctx) return;
  const buf = buffers.get(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

export function setSfxMuted(v: boolean) {
  muted = v;
}
