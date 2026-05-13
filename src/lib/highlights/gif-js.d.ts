declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    transparent?: number | null;
  }
  interface GIFFrameOptions {
    delay?: number;
    copy?: boolean;
  }
  class GIF {
    constructor(opts?: GIFOptions);
    addFrame(image: CanvasImageSource | ImageData, opts?: GIFFrameOptions): void;
    on(event: 'finished', cb: (blob: Blob) => void): void;
    on(event: 'progress', cb: (progress: number) => void): void;
    on(event: 'abort', cb: () => void): void;
    render(): void;
    abort(): void;
  }
  export default GIF;
}
