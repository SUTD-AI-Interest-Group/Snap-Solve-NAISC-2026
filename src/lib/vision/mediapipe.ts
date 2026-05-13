import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult
} from '@mediapipe/tasks-vision';
import type { Hand } from './types';

let landmarker: HandLandmarker | null = null;

export async function initHandLandmarker(numHands = 4): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
  landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/mediapipe/hand_landmarker.task', delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  return landmarker;
}

export function detectHands(video: HTMLVideoElement, tsMs: number): Hand[] {
  if (!landmarker) return [];
  const res: HandLandmarkerResult = landmarker.detectForVideo(video, tsMs);
  const hands: Hand[] = [];
  for (let i = 0; i < res.landmarks.length; i++) {
    const lms = res.landmarks[i].map((p) => ({ x: p.x, y: p.y, z: p.z }));
    const conf = res.handedness[i]?.[0]?.score ?? 1;
    hands.push({
      landmarks: lms,
      worldLandmarks: res.worldLandmarks[i]?.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      confidence: conf
    });
  }
  return hands;
}
