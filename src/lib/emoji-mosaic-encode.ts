// Browser-only: reads the user's file, draws each frame of the mosaic and encodes the 100x100 tiles. Nothing is
// uploaded; the file and the tiles stay in this tab. Video is decoded and encoded with WebCodecs through
// mediabunny (VP9 in WebM, alpha kept as side data when the corners are cut or the frame is padded).
import { ALL_FORMATS, BlobSource, BufferSource, BufferTarget, CanvasSink, CanvasSource, Input, Output, Quality, WebMOutputFormat, canEncodeVideo } from "mediabunny";
import {
  DEFAULT_FALLBACK,
  MAX_FPS,
  MAX_SECONDS,
  MAX_VIDEO_BYTES,
  MOSAIC_SCHEMA,
  type MosaicManifest,
  type Outline,
  type Rect,
  TILE,
  placement,
  strokeOutline,
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
  outline?: Outline;
};

export type EncodedMosaic = { manifest: MosaicManifest; files: { name: string; data: Uint8Array<ArrayBuffer> }[] };

/** Bitrates tried in turn for the tiles still over the target. All variable-rate: a constant-rate VP9 encoder may
 *  drop frames to hold its rate, and a tile with fewer frames drifts away from the others in Telegram. The
 *  software encoder is asked for, since hardware VP9 encoders may ignore the bitrate. */
const BITRATES = [160_000, 110_000, 75_000, 50_000];
/** The size each tile aims for. Telegram documents 256 KB, but has refused tiles under it with
 *  STICKER_VIDEO_BIG; its own video emoji are mostly 20-60 KB, and at 100x100 this budget still looks sharp. */
const TARGET_BYTES = 64 * 1024;
/** Never sent: over Telegram's documented limit, less some room for the WebM container. */
const HARD_BYTES = MAX_VIDEO_BYTES - 4 * 1024;
/** Tiles encoded side by side from one decode of the clip. Each encoder is a 100x100 VP9 stream, so 50 at once is
 *  light; most grids then need a single pass over the video. */
const BATCH = 50;

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
  let software = false;
  const newSink = () => new CanvasSink(track, { alpha: true, poolSize: 2, decoderOptions: { hardwareAcceleration: software ? "prefer-software" : "no-preference" } });
  let sink = newSink();
  const lock = serial();
  return {
    kind: "video", width: track.displayWidth, height: track.displayHeight, duration, mayHaveAlpha: type === "video/webm",
    // One reader at a time (timeline thumbnails, the content check's frames, the encoding), so the page never
    // runs several decoders on the clip at once. A decoder can fail for reasons that aren't the file's (the GPU
    // busy with the page's own videos, or reset): reading then resumes at the frame that failed with a new
    // decoder, and on a second failure with the software one.
    async *frames(times) {
      const release = await lock();
      try {
        let done = 0;
        for (let attempt = 0; ; attempt++) {
          try {
            for await (const wrapped of sink.canvasesAtTimestamps(times.slice(done).map((t) => first + t))) {
              yield wrapped?.canvas ?? null;
              done++;
            }
            return;
          } catch (err) {
            if (attempt >= 2 || (err instanceof DOMException && err.name === "AbortError")) {
              const why = err instanceof Error ? err.message : String(err);
              throw new Error(`This browser couldn't decode the video (${why}). Try again; if it keeps failing, convert the clip to an MP4 (H.264) or try another browser.`);
            }
            if (attempt === 1) software = true;
            sink = newSink();
          }
        }
      } finally {
        release();
      }
    },
    dispose: () => input.dispose(),
  };
}

/** A queue of one: each caller waits for the one before it to release. */
function serial(): () => Promise<() => void> {
  let tail = Promise.resolve();
  return () => {
    let release!: () => void;
    const turn = new Promise<void>((resolve) => (release = resolve));
    const wait = tail;
    tail = tail.then(() => turn);
    return wait.then(() => release);
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
export function drawMosaic(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, image: CanvasImageSource, s: Pick<MosaicSettings, "cols" | "rows" | "crop" | "fit" | "radius" | "outline">) {
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
  strokeOutline(ctx, width, height, s.radius, s.outline);
}

/** Frames (packets) in an encoded tile. */
async function frameCount(data: Uint8Array<ArrayBuffer>): Promise<number> {
  const input = new Input({ formats: ALL_FORMATS, source: new BufferSource(data) });
  try {
    const track = await input.getPrimaryVideoTrack();
    return track ? (await track.computePacketStats()).packetCount : 0;
  } finally {
    input.dispose();
  }
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
  // Alpha is a second stream in VP9 and about doubles a tile, so only tiles with a see-through pixel carry it:
  // with "cover" and an opaque source, those are the tiles the rounded corners cut into.
  const cornerTile = (i: number) => {
    const c = i % s.cols;
    const r = Math.floor(i / s.cols);
    const reach = Math.ceil(s.radius / TILE);
    return (c < reach || c >= s.cols - reach) && (r < reach || r >= s.rows - reach);
  };
  const tileAlpha = (i: number) => s.fit === "contain" || source.mayHaveAlpha || (s.radius > 0 && cornerTile(i));
  const files: EncodedMosaic["files"] = [];
  let usedFps = still ? 0 : fps;
  let usedDuration = duration;

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
    // The tiles play side by side in Telegram, each looping on its own, so they must agree to the frame: one frame
    // rate, one frame count and the same timestamps for the whole mosaic. Only the bitrate differs from tile to
    // tile. When a tile can't fit even at the lowest bitrate, the whole mosaic drops to half the frame rate.
    const encodeAt = async (rate: number, label: string) => {
      const frames = Math.max(1, Math.round(duration * rate));
      const times = Array.from({ length: frames }, (_, i) => s.start + i / rate);
      const out = new Map<number, Uint8Array<ArrayBuffer>>();
      let pending = Array.from({ length: count }, (_, i) => i);
      for (const [pass, bitrate] of BITRATES.entries()) {
        if (!pending.length) break;
        const over: number[] = [];
        for (let first = 0; first < pending.length; first += BATCH) {
          if (signal?.aborted) throw new DOMException("Stopped", "AbortError");
          const batch = pending.slice(first, first + BATCH);
          const encoders = batch.map((index) => {
            const tile = new OffscreenCanvas(TILE, TILE);
            const tctx = tile.getContext("2d", { alpha: true })!;
            const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
            const keep = tileAlpha(index);
            const video = new CanvasSource(tile, { codec: "vp9", quality: new Quality({ bitrate, bitrateMode: "variable" }), alpha: keep ? "keep" : "discard", keyFrameInterval: MAX_SECONDS, hardwareAcceleration: "prefer-software" });
            output.addVideoTrack(video, { frameRate: rate, canBeTransparent: keep });
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
              return e.video.add(frame / rate, 1 / rate);
            }));
            frame++;
            onProgress(first + Math.round((frame / frames) * batch.length), pending.length, pass === 0 ? label : "Shrinking large tiles");
          }
          for (const e of encoders) {
            await e.output.finalize();
            const data = new Uint8Array(e.output.target.buffer!);
            if (data.length > TARGET_BYTES) over.push(e.index);
            if (!out.has(e.index) || data.length < out.get(e.index)!.length) out.set(e.index, data);
          }
        }
        pending = over;
      }
      return { out, frames };
    };

    let rate = fps;
    let { out, frames } = await encodeAt(rate, "Encoding tiles");
    const tooBig = () => [...out.values()].filter((d) => d.length > HARD_BYTES).length;
    if (tooBig() && fps > 1) {
      rate = Math.max(1, Math.round(fps / 2));
      ({ out, frames } = await encodeAt(rate, "Encoding at half the frame rate"));
    }
    if (tooBig()) {
      throw new Error(`${tooBig() === 1 ? "One tile is" : `${tooBig()} tiles are`} still over Telegram's 256 KB even at the lowest quality. Pick a shorter or calmer part of the clip, use fewer frames per second, or turn Animated off.`);
    }
    // A tile that lost a frame would loop shorter than the rest and drift further off on every loop.
    const counts = await Promise.all(Array.from({ length: count }, (_, i) => frameCount(out.get(i)!)));
    const off = counts.findIndex((n) => n !== frames);
    if (off !== -1) throw new Error(`Tile ${off + 1} came out with ${counts[off]} frames instead of ${frames}, so it would play out of step. Try again, or use Chrome.`);
    usedFps = rate;
    usedDuration = frames / rate;
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
    source: { name: file.name, width: source.width, height: source.height, box: s.crop, fit: s.fit, background: "transparent", start: Math.round(s.start * 1000) / 1000, duration: Math.round(usedDuration * 1000) / 1000, fps: usedFps, pingpong: false },
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
