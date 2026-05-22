export type WebcamHandle = {
  video: HTMLVideoElement;
  stream: MediaStream;
  stop: () => void;
};

export async function openWebcam(deviceId?: string): Promise<WebcamHandle> {
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  };
  // Pin to a specific camera when the user has chosen one; otherwise let the
  // browser pick its default.
  if (deviceId) video.deviceId = { exact: deviceId };
  const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
  const el = document.createElement('video');
  el.srcObject = stream;
  el.muted = true;
  el.playsInline = true;
  await el.play();
  return {
    video: el,
    stream,
    stop: () => {
      stream.getTracks().forEach((t) => t.stop());
      el.srcObject = null;
    }
  };
}

/**
 * List available video input devices. Device labels are only populated after
 * camera permission has been granted, so call this AFTER a successful
 * openWebcam() to get human-readable names.
 */
export async function listCameras(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput');
  } catch {
    return [];
  }
}
