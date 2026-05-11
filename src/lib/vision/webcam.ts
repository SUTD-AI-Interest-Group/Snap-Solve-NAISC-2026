export type WebcamHandle = {
  video: HTMLVideoElement;
  stream: MediaStream;
  stop: () => void;
};

export async function openWebcam(): Promise<WebcamHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    audio: false
  });
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return {
    video,
    stream,
    stop: () => {
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
  };
}
