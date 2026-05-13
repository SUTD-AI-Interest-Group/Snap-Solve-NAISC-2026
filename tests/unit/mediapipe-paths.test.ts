import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  beforeEach(() => {
    // Each it() must observe its own init() call; otherwise reading
    // mock.calls[0] in test 2 could pick up test 1's call.
    vi.clearAllMocks();
  });

  it('passes the self-hosted wasm path to FilesetResolver', async () => {
    await initHandLandmarker();
    expect(FilesetResolver.forVisionTasks).toHaveBeenLastCalledWith('/mediapipe/wasm');
  });

  it('passes the self-hosted model path to HandLandmarker', async () => {
    await initHandLandmarker();
    const calls = (HandLandmarker.createFromOptions as unknown as { mock: { calls: unknown[][] } })
      .mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const arg = calls[calls.length - 1][1] as { baseOptions: { modelAssetPath: string } };
    expect(arg.baseOptions.modelAssetPath).toBe('/mediapipe/hand_landmarker.task');
  });
});
