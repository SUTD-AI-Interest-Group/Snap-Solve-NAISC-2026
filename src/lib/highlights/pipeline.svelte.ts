import { PUBLIC_HIGHLIGHTS_FUNCTION_URL } from '$env/static/public';
import type { HighlightEvent, GameMeta } from '$lib/game/state';
import { clipToGif } from './clipper';
import { selectHighlights, type HighlightKind } from './selector';
import { uploadGame } from './uploader';

export type PipelineStage = 'idle' | 'clipping' | 'uploading' | 'ready' | 'error';

export type PipelineHighlight = {
  kind: HighlightKind;
  player: 'p1' | 'p2';
  gif: Blob;
  caption: string;
  firstFrame: ImageBitmap;
};

export const pipeline = $state<{
  stage: PipelineStage;
  completedClips: number;
  totalClips: number;
  landingUrl: string | null;
  highlights: PipelineHighlight[];
  errorMessage: string | null;
}>({
  stage: 'idle',
  completedClips: 0,
  totalClips: 0,
  landingUrl: null,
  highlights: [],
  errorMessage: null
});

let abortController: AbortController | null = null;

export function resetPipeline(): void {
  abortController?.abort();
  abortController = null;
  pipeline.stage = 'idle';
  pipeline.completedClips = 0;
  pipeline.totalClips = 0;
  pipeline.landingUrl = null;
  pipeline.highlights = [];
  pipeline.errorMessage = null;
}

export async function runPipeline(
  recording: Blob,
  events: HighlightEvent[],
  startedAtMs: number,
  meta: GameMeta
): Promise<void> {
  resetPipeline();
  abortController = new AbortController();
  const signal = abortController.signal;

  const windows = selectHighlights(events, startedAtMs, meta.winner, meta.p1Name, meta.p2Name);
  if (windows.length === 0) {
    pipeline.stage = 'error';
    pipeline.errorMessage = 'No highlights found in this match.';
    return;
  }

  pipeline.stage = 'clipping';
  pipeline.totalClips = windows.length;

  const clipped: Array<{ window: (typeof windows)[number]; gif: Blob; firstFrame: ImageBitmap }> =
    [];
  for (const window of windows) {
    try {
      const { gif, firstFrame } = await clipToGif(recording, window, signal);
      clipped.push({ window, gif, firstFrame });
      pipeline.highlights = [
        ...pipeline.highlights,
        {
          kind: window.kind,
          player: window.player,
          gif,
          caption: window.caption,
          firstFrame
        }
      ];
      pipeline.completedClips += 1;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('runPipeline: clipping failed for window', window, err);
      // Skip this window but continue with the rest.
    }
  }

  if (clipped.length === 0) {
    pipeline.stage = 'error';
    pipeline.errorMessage = 'All clip encodes failed.';
    return;
  }

  pipeline.stage = 'uploading';
  const uploaded = await uploadGame(meta, clipped, PUBLIC_HIGHLIGHTS_FUNCTION_URL);
  if (!uploaded) {
    pipeline.stage = 'error';
    pipeline.errorMessage = 'Could not save your highlights to the cloud.';
    return;
  }
  pipeline.landingUrl = uploaded.landingUrl;
  pipeline.stage = 'ready';
}
