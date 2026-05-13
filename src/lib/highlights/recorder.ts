import { HIGHLIGHTS_CONFIG } from '$lib/config';

export interface RecorderHandle {
  startedAtMs: number;
  stop(): Promise<{ blob: Blob; durationMs: number }>;
}

const MIME_CANDIDATES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'] as const;

function pickMime(): string {
  for (const m of MIME_CANDIDATES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

export function startRecording(canvas: HTMLCanvasElement): RecorderHandle {
  const stream = canvas.captureStream(HIGHLIGHTS_CONFIG.recordingFps);
  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: HIGHLIGHTS_CONFIG.recordingBitrate
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };
  // 1-second timeslice gives us periodic keyframes for seek support.
  recorder.start(1000);
  const startedAtMs = performance.now();

  return {
    startedAtMs,
    stop(): Promise<{ blob: Blob; durationMs: number }> {
      return new Promise((resolve, reject) => {
        const finalize = () => {
          try {
            const blob = new Blob(chunks, { type: mimeType });
            const durationMs = performance.now() - startedAtMs;
            // Stop the captured tracks so the canvas doesn't keep emitting.
            stream.getTracks().forEach((t) => t.stop());
            resolve({ blob, durationMs });
          } catch (e) {
            reject(e);
          }
        };
        recorder.onstop = finalize;
        recorder.onerror = (e) => reject((e as ErrorEvent).error ?? e);
        if (recorder.state !== 'inactive') recorder.stop();
        else finalize();
      });
    }
  };
}
