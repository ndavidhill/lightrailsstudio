/* Offline video export. Frames are rendered at exact timestamps into an
   off-screen renderer, composited for the loop mode, encoded with WebCodecs and
   muxed into MP4 (H.264) or WebM (VP9). Nothing here touches the live stage. */
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from "mp4-muxer";
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from "webm-muxer";
import { Config } from "./config";
import { Renderer } from "./renderer";

export type VideoFormat = "mp4" | "webm";
export type LoopMode = "crossfade" | "cut";

export interface VideoOptions {
  format: VideoFormat;
  width: number;
  height: number;
  fps: number;
  seconds: number;      // one loop
  repeats: number;      // how many loops in the file
  loop: LoopMode;
  quality: "good" | "high";
  config: Config;
}

export interface VideoSupport { webcodecs: boolean; mp4: boolean; webm: boolean }

function avcCodec(w: number, h: number): string {
  // High profile; level 4.0 up to 1080p, 5.1 beyond (4K)
  return w * h > 1920 * 1088 ? "avc1.640033" : "avc1.640028";
}
const VP9 = "vp09.00.10.08";

function bitrate(w: number, h: number, quality: VideoOptions["quality"]): number {
  const base = quality === "high" ? 24e6 : 12e6; // for 1080p
  return Math.round(base * (w * h) / (1920 * 1080));
}

export async function videoSupport(w = 1920, h = 1080): Promise<VideoSupport> {
  if (typeof VideoEncoder === "undefined") return { webcodecs: false, mp4: false, webm: false };
  const test = async (codec: string) => {
    try { return (await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate: 8e6, framerate: 30 })).supported === true; }
    catch { return false; }
  };
  const [mp4, webm] = await Promise.all([test(avcCodec(w, h)), test(VP9)]);
  return { webcodecs: true, mp4, webm };
}

export function estimateBytes(o: Pick<VideoOptions, "width" | "height" | "fps" | "seconds" | "repeats" | "quality">): number {
  return (bitrate(o.width, o.height, o.quality) / 8) * o.seconds * o.repeats;
}

/* Render and encode. Progress is 0..1. Abort via the signal. */
export async function renderVideo(o: VideoOptions, onProgress: (p: number) => void, signal?: AbortSignal): Promise<Blob> {
  const width = o.width & ~1, height = o.height & ~1; // encoders want even sizes
  const fps = o.fps;
  const N = Math.max(2, Math.round(o.seconds * fps));
  const D = N / fps;
  const frameUs = Math.round(1e6 / fps);

  const glCanvas = document.createElement("canvas");
  const renderer = new Renderer(glCanvas, () => o.config);
  renderer.setFixedSize(width, height);
  const comp = document.createElement("canvas");
  comp.width = width; comp.height = height;
  const ctx = comp.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("2D canvas unavailable");

  const codec = o.format === "mp4" ? avcCodec(width, height) : VP9;
  const cfg: VideoEncoderConfig = { codec, width, height, bitrate: bitrate(width, height, o.quality), framerate: fps, latencyMode: "quality" };
  if (o.format === "mp4") (cfg as VideoEncoderConfig & { avc?: { format: string } }).avc = { format: "avc" };
  const ok = await VideoEncoder.isConfigSupported(cfg);
  if (!ok.supported) throw new Error(`${o.format.toUpperCase()} encoding is not supported in this browser`);

  const mp4 = o.format === "mp4"
    ? new Mp4Muxer({ target: new Mp4Target(), video: { codec: "avc", width, height, frameRate: fps }, fastStart: "in-memory" })
    : null;
  const webm = o.format === "webm"
    ? new WebmMuxer({ target: new WebmTarget(), video: { codec: "V_VP9", width, height, frameRate: fps } })
    : null;

  // first pass chunks are kept so repeats are copied, not re-rendered
  const kept: { chunk: EncodedVideoChunk; meta?: EncodedVideoChunkMetadata }[] = [];
  let encErr: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      kept.push({ chunk, meta });
      if (mp4) mp4.addVideoChunk(chunk, meta); else webm!.addVideoChunk(chunk, meta);
    },
    error: (e) => { encErr = e; },
  });
  encoder.configure(cfg);

  const yieldNow = () => new Promise<void>((r) => setTimeout(r, 0));
  const total = N * o.repeats;
  const gop = fps; // one keyframe per second

  try {
    for (let i = 0; i < N; i++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      if (encErr) throw encErr;
      const t = i / fps;
      if (o.loop === "crossfade") {
        // out(t) = mix(A(t + D), A(t), t / D): both ends equal A(D), so the
        // file joins to itself with no cut while every frame keeps moving.
        renderer.draw(t + D);
        ctx.globalAlpha = 1;
        ctx.drawImage(glCanvas, 0, 0);
        renderer.draw(t);
        ctx.globalAlpha = i / N;
        ctx.drawImage(glCanvas, 0, 0);
        ctx.globalAlpha = 1;
      } else {
        renderer.draw(t);
        ctx.drawImage(glCanvas, 0, 0);
      }
      const frame = new VideoFrame(comp, { timestamp: i * frameUs, duration: frameUs });
      encoder.encode(frame, { keyFrame: i % gop === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 6) await yieldNow();
      if (i % 4 === 0) { onProgress((i + 1) / total); await yieldNow(); }
    }
    await encoder.flush();
    if (encErr) throw encErr;

    // repeats: re-add the encoded chunks shifted in time
    for (let r = 1; r < o.repeats; r++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      const offset = r * N * frameUs;
      for (const { chunk } of kept) {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        const copy = new EncodedVideoChunk({ type: chunk.type, timestamp: chunk.timestamp + offset, duration: chunk.duration ?? frameUs, data });
        if (mp4) mp4.addVideoChunk(copy); else webm!.addVideoChunk(copy);
      }
      onProgress((r + 1) / o.repeats);
      await yieldNow();
    }
    onProgress(1);

    if (mp4) { mp4.finalize(); return new Blob([mp4.target.buffer], { type: "video/mp4" }); }
    webm!.finalize(); return new Blob([webm!.target.buffer], { type: "video/webm" });
  } finally {
    try { encoder.close(); } catch { /* already closed */ }
    renderer.dispose();
  }
}

/* Realtime fallback for browsers without WebCodecs: capture the live stage
   with MediaRecorder for the requested length. WebM only, straight cut. */
export function recordFallback(canvas: HTMLCanvasElement, seconds: number, onProgress: (p: number) => void, signal?: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof MediaRecorder === "undefined") return reject(new Error("Video export is not supported in this browser"));
    const stream = canvas.captureStream(60);
    const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: 16e6 });
    const parts: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => resolve(new Blob(parts, { type: "video/webm" }));
    rec.onerror = () => reject(new Error("Recording failed"));
    const t0 = performance.now();
    const tick = window.setInterval(() => {
      const p = (performance.now() - t0) / (seconds * 1000);
      onProgress(Math.min(1, p));
      if (signal?.aborted) { window.clearInterval(tick); rec.stop(); reject(new DOMException("Export cancelled", "AbortError")); }
      else if (p >= 1) { window.clearInterval(tick); rec.stop(); }
    }, 100);
    rec.start(250);
  });
}
