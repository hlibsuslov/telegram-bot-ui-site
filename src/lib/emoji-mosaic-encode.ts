// Browser-only: reads the user's file, draws each frame of the mosaic and encodes the 100x100 tiles. Nothing is
// uploaded; the file and the tiles stay in this tab. Video is decoded and encoded with WebCodecs through
// mediabunny (VP9 in WebM, alpha kept as side data when the corners are cut or the frame is padded).
import { ALL_FORMATS, BlobSource, BufferTarget, CanvasSink, CanvasSource, Input, Output, Quality, WebMOutputFormat, canEncodeVideo } from "mediabunny";
import {
  DEFAULT_FALLBACK,
  MAX_FPS,
  MAX_SECONDS,
  MAX_VIDEO_BYTES,
  MOSAIC_SCHEMA,
  type MosaicManifest,
  type Rect,
  TILE,
  placement,
  tileNames,
} from "./emoji-mosaic";

export type FrameSource = {
  kind: "video" | "gif" | "image";
  width: number;
  height: number;
  /** Seconds; 0 for a still picture. */
  duration: number;
  mayHaveAlpha: boolean;
  /** Frames at the given times (seconds from the start of the media), in order. Each is valid until the next. */
  frames(times: number[]): AsyncGenerator<CanvasImageSource | null>;
  dispose(): void;
};

export type MosaicSettings = {
  cols: number;
  rows: number;
  crop: Rect;
  fit: "cover" | "contain";
  radius: number;
  start: number;
  duration: number;
  fps: number;
  still: boolean;
  fallback?: string;
  /** The emoji behind each tile, in tile order. */
  emoji?: string[];
};

export type EncodedMosaic = { manifest: MosaicManifest; files: { name: string; data: Uint8Array<ArrayBuffer> }[] };

const BITRATES = [400_000, 250_000, 160_000, 100_000];
const BATCH = 16;

type DecoderFrame = { image: CanvasImageSource & { close(): void }; duration: number | null; timestamp: number };
type ImageDecoderLike = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
  completed: Promise<void>;
  decode(options: { frameIndex: number }): Promise<DecoderFrame>;
  close(): void;
};

export async function openSource(file: File): Promise<FrameSource> {
  const type = file.type || "";
  if (type === "image/gif" && "ImageDecoder" in globalThis) return openGif(file);
  if (type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    return {
      kind: "image", width: bitmap.width, height: bitmap.height, duration: 0, mayHaveAlpha: type !== "image/jpeg",
      async *frames(times) { for (let i = 0; i < times.length; i++) yield bitmap; },
      dispose: () => bitmap.close(),
    };
  }
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("This file has no video track.");
  if (!(await track.canDecode())) throw new Error("This browser can't decode this video. Try an MP4 (H.264) or WebM file, or another browser.");
  const first = await input.getFirstTimestamp([track]);
  const duration = Math.max(0, (await track.computeDuration()) - first);
  const sink = new CanvasSink(track, { alpha: true, poolSize: 2 });
  return {
    kind: "video", width: track.displayWidth, height: track.displayHeight, duration, mayHaveAlpha: type === "video/webm",
    async *frames(times) {
      for await (const wrapped of sink.canvasesAtTimestamps(times.map((t) => first + t))) yield wrapped?.canvas ?? null;
    },
    dispose: () => input.dispose(),
  };
}

async function openGif(file: File): Promise<FrameSource> {
  const Decoder = (globalThis as unknown as { ImageDecoder: new (init: { data: ReadableStream; type: string }) => ImageDecoderLike }).ImageDecoder;
  const decoder = new Decoder({ data: file.stream(), type: "image/gif" });
  await decoder.tracks.ready;
  await decoder.completed;
  const count = decoder.tracks.selectedTrack?.frameCount ?? 1;
  const starts: number[] = [];
  let width = 0;
  let height = 0;
  let total = 0;
  for (let i = 0; i < count; i++) {
    const { image, duration } = await decoder.decode({ frameIndex: i });
    const frame = image as unknown as VideoFrame;
    width = frame.displayWidth;
    height = frame.displayHeight;
    starts.push(total);
    total += (duration ?? 100_000) / 1e6;
    image.close();
  }
  return {
    kind: "gif", width, height, duration: count > 1 ? total : 0, mayHaveAlpha: true,
    async *frames(times) {
      let last: (CanvasImageSource & { close(): void }) | null = null;
      for (const t of times) {
        let index = 0;
        while (index + 1 < starts.length && starts[index + 1] <= t) index++;
        const { image } = await decoder.decode({ frameIndex: index });
        last?.close();
        last = image;
        yield image;
      }
      last?.close();
    },
    dispose: () => decoder.close(),
  };
}

/** Draws one mosaic frame: the crop placed on the cols*100 x rows*100 canvas, corners cut when asked. */
export function drawMosaic(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, image: CanvasImageSource, s: Pick<MosaicSettings, "cols" | "rows" | "crop" | "fit" | "radius">) {
  const width = s.cols * TILE;
  const height = s.rows * TILE;
  const at = placement(s.crop, s.cols, s.rows, s.fit);
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, s.crop.x, s.crop.y, s.crop.w, s.crop.h, at.x, at.y, at.w, at.h);
  if (s.radius > 0) {
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, s.radius);
    ctx.fill();
  }
  ctx.restore();
}

export async function canEncodeVp9(): Promise<boolean> {
  if (typeof VideoEncoder === "undefined") return false;
  try {
    return await canEncodeVideo("vp9", { width: TILE, height: TILE });
  } catch {
    return false;
  }
}

export async function encodeMosaic(file: File, source: FrameSource, s: MosaicSettings, onProgress: (done: number, total: number, label: string) => void, signal?: AbortSignal): Promise<EncodedMosaic> {
  const still = s.still || source.duration === 0;
  const fps = Math.min(MAX_FPS, Math.max(1, Math.round(s.fps)));
  const duration = still ? 0 : Math.min(MAX_SECONDS, s.duration, Math.max(0, source.duration - s.start));
  if (!still && duration <= 0) throw new Error("Nothing left to cut: the start is past the end of the video.");
  const count = s.cols * s.rows;
  const names = tileNames(s.cols, s.rows, still ? "png" : "webm");
  const canvas = new OffscreenCanvas(s.cols * TILE, s.rows * TILE);
  const ctx = canvas.getContext("2d", { alpha: true })!;
  const alpha = s.radius > 0 || s.fit === "contain" || source.mayHaveAlpha;
  const files: EncodedMosaic["files"] = [];

  if (still) {
    for await (const image of source.frames([s.start])) if (image) drawMosaic(ctx, image, s);
    for (let i = 0; i < count; i++) {
      const tile = new OffscreenCanvas(TILE, TILE);
      tile.getContext("2d")!.drawImage(canvas, (i % s.cols) * TILE, Math.floor(i / s.cols) * TILE, TILE, TILE, 0, 0, TILE, TILE);
      const blob = await tile.convertToBlob({ type: "image/png" });
      files.push({ name: names[i], data: new Uint8Array(await blob.arrayBuffer()) });
      onProgress(i + 1, count, "Cutting tiles");
    }
  } else {
    const frames = Math.max(1, Math.round(duration * fps));
    const times = Array.from({ length: frames }, (_, i) => s.start + i / fps);
    const out = new Map<number, Uint8Array<ArrayBuffer>>();
    let pending = Array.from({ length: count }, (_, i) => i);
    for (const bitrate of BITRATES) {
      if (!pending.length) break;
      const over: number[] = [];
      for (let first = 0; first < pending.length; first += BATCH) {
        if (signal?.aborted) throw new DOMException("Stopped", "AbortError");
        const batch = pending.slice(first, first + BATCH);
        const encoders = batch.map((index) => {
          const tile = new OffscreenCanvas(TILE, TILE);
          const tctx = tile.getContext("2d", { alpha: true })!;
          const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
          const video = new CanvasSource(tile, { codec: "vp9", quality: new Quality({ bitrate, bitrateMode: "variable" }), alpha: alpha ? "keep" : "discard", keyFrameInterval: MAX_SECONDS });
          output.addVideoTrack(video, { frameRate: fps, canBeTransparent: alpha });
          return { index, tile, tctx, output, video };
        });
        await Promise.all(encoders.map((e) => e.output.start()));
        let frame = 0;
        for await (const image of source.frames(times)) {
          if (signal?.aborted) throw new DOMException("Stopped", "AbortError");
          if (image) drawMosaic(ctx, image, s);
          await Promise.all(encoders.map((e) => {
            e.tctx.clearRect(0, 0, TILE, TILE);
            e.tctx.drawImage(canvas, (e.index % s.cols) * TILE, Math.floor(e.index / s.cols) * TILE, TILE, TILE, 0, 0, TILE, TILE);
            return e.video.add(frame / fps, 1 / fps);
          }));
          frame++;
          onProgress(first + Math.round((frame / frames) * batch.length), pending.length, bitrate === BITRATES[0] ? "Encoding tiles" : "Shrinking large tiles");
        }
        for (const e of encoders) {
          await e.output.finalize();
          const data = new Uint8Array(e.output.target.buffer!);
          if (data.length > MAX_VIDEO_BYTES && bitrate !== BITRATES[BITRATES.length - 1]) over.push(e.index);
          out.set(e.index, data);
        }
      }
      pending = over;
    }
    for (let i = 0; i < count; i++) files.push({ name: names[i], data: out.get(i)! });
  }

  const manifest: MosaicManifest = {
    schema: MOSAIC_SCHEMA,
    format: still ? "static" : "video",
    grid: { cols: s.cols, rows: s.rows },
    tile: TILE,
    fallback: s.fallback || DEFAULT_FALLBACK,
    ...(s.emoji?.length === count ? { emoji: s.emoji } : {}),
    tiles: names,
    source: { name: file.name, width: source.width, height: source.height, box: s.crop, fit: s.fit, background: "transparent", start: Math.round(s.start * 1000) / 1000, duration: Math.round(duration * 1000) / 1000, fps: still ? 0 : fps, pingpong: false },
    round: Math.round(s.radius),
    alpha: still ? true : alpha,
    made_by: "telegram-bot-ui-site /emoji/mosaic",
  };
  return { manifest, files };
}

/** Frames of the whole mosaic for the content check: up to five JPEGs, at most 768 px wide, spread over the clip. */
export async function sampleFrames(source: FrameSource, s: MosaicSettings, count = 5): Promise<Blob[]> {
  const still = s.still || source.duration === 0;
  const duration = still ? 0 : Math.min(MAX_SECONDS, s.duration, Math.max(0, source.duration - s.start));
  const times = still ? [s.start] : Array.from({ length: count }, (_, i) => s.start + (duration * i) / count);
  const canvas = new OffscreenCanvas(s.cols * TILE, s.rows * TILE);
  const ctx = canvas.getContext("2d", { alpha: true })!;
  const scale = Math.min(1, 768 / canvas.width);
  const out = new OffscreenCanvas(Math.round(canvas.width * scale), Math.round(canvas.height * scale));
  const octx = out.getContext("2d")!;
  const frames: Blob[] = [];
  for await (const image of source.frames(times)) {
    if (!image) continue;
    drawMosaic(ctx, image, s);
    octx.fillStyle = "#808080";
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0, out.width, out.height);
    frames.push(await out.convertToBlob({ type: "image/jpeg", quality: 0.82 }));
  }
  return frames;
}
