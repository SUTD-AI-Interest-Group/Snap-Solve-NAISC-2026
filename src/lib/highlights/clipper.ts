import GIF from 'gif.js';
import { HIGHLIGHTS_CONFIG } from '$lib/config';
import type { HighlightWindow } from './selector';

export interface ClipResult {
  gif: Blob;
  firstFrame: ImageBitmap;
}

export async function clipToGif(
  recording: Blob,
  window: HighlightWindow,
  signal?: AbortSignal
): Promise<ClipResult> {
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
  const url = URL.createObjectURL(recording);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.src = url;

  try {
    await once(video, 'loadedmetadata');
    const fps = HIGHLIGHTS_CONFIG.gifFps;
    const width = HIGHLIGHTS_CONFIG.gifWidth;
    const height = HIGHLIGHTS_CONFIG.gifHeight;
    const step = 1 / fps;
    const totalFrames = Math.max(1, Math.floor((window.endMs - window.startMs) / 1000 / step));

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d')!;

    const gif = new GIF({
      workers: HIGHLIGHTS_CONFIG.gifWorkers,
      quality: HIGHLIGHTS_CONFIG.gifQuality,
      width,
      height,
      workerScript: '/gifjs/gif.worker.js'
    });

    let firstFrame: ImageBitmap | null = null;

    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        gif.abort();
        throw new DOMException('aborted', 'AbortError');
      }
      const targetSec = window.startMs / 1000 + i * step;
      video.currentTime = targetSec;
      await once(video, 'seeked');

      // Letterbox: fit video into offscreen canvas while preserving aspect.
      const vw = video.videoWidth || width;
      const vh = video.videoHeight || height;
      const scale = Math.min(width / vw, height / vh);
      const dw = Math.round(vw * scale);
      const dh = Math.round(vh * scale);
      const dx = Math.floor((width - dw) / 2);
      const dy = Math.floor((height - dh) / 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(video, dx, dy, dw, dh);

      gif.addFrame(offscreen, { copy: true, delay: Math.round(1000 / fps) });
      if (!firstFrame) firstFrame = await createImageBitmap(offscreen);
    }

    const gifBlob: Blob = await new Promise((resolve, reject) => {
      gif.on('finished', (blob: Blob) => resolve(blob));
      gif.on('abort', () => reject(new DOMException('aborted', 'AbortError')));
      gif.render();
    });

    return { gif: gifBlob, firstFrame: firstFrame! };
  } finally {
    URL.revokeObjectURL(url);
    video.remove();
  }
}

function once(target: EventTarget, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = (ev: Event) => {
      cleanup();
      reject(ev);
    };
    const cleanup = () => {
      target.removeEventListener(name, onOk);
      target.removeEventListener('error', onErr);
    };
    target.addEventListener(name, onOk, { once: true });
    target.addEventListener('error', onErr, { once: true });
  });
}
