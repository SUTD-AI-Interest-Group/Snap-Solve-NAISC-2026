import { describe, it, expect, vi } from 'vitest';

vi.mock('@mediapipe/tasks-vision', () => {
  const FilesetResolver = { forVisionTasks: vi.fn(async () => ({})) };
  const HandLandmarker = {
    createFromOptions: vi.fn(async () => ({
      detectForVideo: () => ({ landmarks: [], handedness: [], worldLandmarks: [] })
    }))
  };
  return { FilesetResolver, HandLandmarker };
});

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { initHandLandmarker } from '../../src/lib/vision/mediapipe';

describe('mediapipe paths', () => {
  it('passes the self-hosted wasm path to FilesetResolver', async () => {
    await initHandLandmarker();
    expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith('/mediapipe/wasm');
  });

  it('passes the self-hosted model path to HandLandmarker', async () => {
    await initHandLandmarker();
    const arg = (HandLandmarker.createFromOptions as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      baseOptions: { modelAssetPath: string };
    };
    expect(arg.baseOptions.modelAssetPath).toBe('/mediapipe/hand_landmarker.task');
  });
});
