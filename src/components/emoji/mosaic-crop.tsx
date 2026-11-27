"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Upload } from "lucide-react";
import { MAX_SECONDS, type Outline, type Rect, TILE, clampCrop } from "@/lib/emoji-mosaic";
import type { FrameSource } from "@/lib/emoji-mosaic-encode";

export type Loaded = { file: File; url: string; source: FrameSource };
type Corner = "nw" | "ne" | "sw" | "se";
export const ACCEPT = "video/mp4,video/webm,video/quicktime,image/gif,image/png,image/jpeg,image/webp";

export function DropZone({ onFile, label, hint }: { onFile: (file: File | undefined) => void; label?: string; hint?: string }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}
      className={`tg-field flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center ${over ? "border-[var(--tg-accent)]" : "border-transparent"}`}
    >
      <Upload aria-hidden="true" className="tg-accent size-8" />
      <span className="font-medium">{label ?? "Drop a video, GIF or picture"}</span>
      <span className="tg-hint text-[13px]">{hint ?? "MP4, WebM, MOV, GIF, PNG, JPEG or WebP. Tiles are cut right here in your browser."}</span>
      <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  );
}

export function CropView({ loaded, crop, aspect, grid = null, onCrop, start, duration, animated, still = false, paused = false, onTrim }: {
  loaded: Loaded; crop: Rect; aspect: number | null; grid?: { cols: number; rows: number; radius: number; outline?: Outline } | null; onCrop: (r: Rect) => void;
  start: number; duration: number; animated: boolean; still?: boolean; paused?: boolean; onTrim?: (start: number, length: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const drag = useRef<{ mode: "move" | Corner; x: number; y: number; rect: Rect } | null>(null);
  const { width, height } = loaded.source;
  const isVideo = loaded.source.kind === "video";
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.currentTime = start;
  }, [start]);

  useEffect(() => {
    const v = video.current;
    if (!v || !animated) return;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [animated, paused]);

  useEffect(() => {
    const v = video.current;
    if (!v || !animated) return;
    const loop = () => { if (v.currentTime >= start + Math.min(duration, MAX_SECONDS) || v.currentTime < start) v.currentTime = start; };
    v.addEventListener("timeupdate", loop);
    return () => v.removeEventListener("timeupdate", loop);
  }, [start, duration, animated]);

  function toSource(dx: number, dy: number) {
    const r = box.current!.getBoundingClientRect();
    return { dx: (dx / r.width) * width, dy: (dy / r.height) * height };
  }

  function resize(corner: Corner, rect: Rect, dx: number, dy: number): Rect {
    const left = corner === "nw" || corner === "sw";
    const top = corner === "nw" || corner === "ne";
    const ax = left ? rect.x + rect.w : rect.x;
    const ay = top ? rect.y + rect.h : rect.y;
    let w = Math.max(16, (left ? -1 : 1) * dx + rect.w);
    let h = Math.max(16, (top ? -1 : 1) * dy + rect.h);
    const maxW = left ? ax : width - ax;
    const maxH = top ? ay : height - ay;
    w = Math.min(w, maxW);
    h = Math.min(h, maxH);
    if (aspect) {
      if (w / h > aspect) w = h * aspect;
      else h = w / aspect;
    }
    return { x: Math.round(left ? ax - w : ax), y: Math.round(top ? ay - h : ay), w: Math.round(w), h: Math.round(h) };
  }

  function down(e: ReactPointerEvent, mode: "move" | Corner) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, rect: crop };
  }

  function move(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const { dx, dy } = toSource(e.clientX - d.x, e.clientY - d.y);
    if (d.mode === "move") onCrop(clampCrop({ ...d.rect, x: d.rect.x + dx, y: d.rect.y + dy }, width, height, null));
    else onCrop(resize(d.mode, d.rect, dx, dy));
  }

  function key(mode: "move" | Corner) {
    return (e: ReactKeyboardEvent) => {
      const step = (e.shiftKey ? 20 : 2) * Math.max(1, width / 600);
      const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const delta = map[e.key];
      if (!delta) return;
      e.preventDefault();
      e.stopPropagation();
      if (mode === "move") onCrop(clampCrop({ ...crop, x: crop.x + delta[0], y: crop.y + delta[1] }, width, height, null));
      else onCrop(resize(mode, crop, delta[0], delta[1]));
    };
  }

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const corners: Corner[] = ["nw", "ne", "sw", "se"];
  // With "Fill every tile" on, the frame is the mosaic itself: it shows the tile seams and the rounded
  // corners the tiles will get (radius is in mosaic pixels, a tile is TILE wide).
  const rounding = grid && grid.radius > 0 ? `${(grid.radius / (grid.cols * TILE)) * 100}% / ${(grid.radius / (grid.rows * TILE)) * 100}%` : undefined;
  // The corner handles bend with the frame: their arc has the frame's on-screen corner radius.
  const frameW = (crop.w / width) * boxWidth;
  const frameH = (crop.h / width) * boxWidth;
  // The stroke runs 2 px inside the frame's edge, so its arc is 2 px tighter to stay concentric.
  const arc = Math.max(4, Math.min(grid ? (grid.radius / (grid.cols * TILE)) * frameW : 0, Math.min(frameW, frameH) / 2) - 2);
  // A small corner gets an L-shaped bracket; a big one a short stretch of its own curve, centred on the
  // corner, so the four handles stay four marks even when the frame is a pill.
  const arm = 12;
  const short = arc <= 20;
  const handle = short ? arc + arm + 2 : arc + 2;
  const half = Math.min(22 / arc, Math.PI / 4);
  const at = (t: number) => `${(arc + 2 - arc * Math.cos(t)).toFixed(2)} ${(arc + 2 - arc * Math.sin(t)).toFixed(2)}`;
  const bracket = short
    ? `M2 ${handle}V${arc + 2}A${arc} ${arc} 0 0 1 ${arc + 2} 2H${handle}`
    : `M${at(Math.PI / 4 - half)}A${arc} ${arc} 0 0 1 ${at(Math.PI / 4 + half)}`;
  return (
    <div className="flex flex-col items-center">
      <div ref={box} className="relative w-full touch-none select-none overflow-hidden rounded-xl bg-[repeating-conic-gradient(#8882_0_25%,transparent_0_50%)] bg-[length:16px_16px]" style={{ aspectRatio: `${width} / ${height}`, maxHeight: "var(--crop-max, 62vh)", maxWidth: `calc(var(--crop-max, 62vh) * ${width / height})` }} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
        {isVideo ? (
          <video ref={video} src={loaded.url} muted playsInline autoPlay={animated} loop className="pointer-events-none absolute inset-0 size-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset
          <img src={loaded.url} alt="" className="pointer-events-none absolute inset-0 size-full" />
        )}
        <div
          role="group" aria-label="Crop area" tabIndex={0} onPointerDown={(e) => down(e, "move")} onKeyDown={key("move")}
          className="group/crop absolute cursor-move"
          style={{ left: pct(crop.x, width), top: pct(crop.y, height), width: pct(crop.w, width), height: pct(crop.h, height) }}
        >
          {/* Everything outside the frame is dimmed; the spread shadow follows the rounded corners. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 [box-shadow:0_0_0_100vmax_rgb(0_0_0/0.55)]" style={{ borderRadius: rounding }} />
          {grid && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-60 transition-opacity group-hover/crop:opacity-100" style={{ borderRadius: rounding }}>
              {Array.from({ length: grid.cols - 1 }, (_, i) => <span key={`c${i}`} className="absolute inset-y-0 w-px -translate-x-1/2 bg-white/45" style={{ left: pct(i + 1, grid.cols) }} />)}
              {Array.from({ length: grid.rows - 1 }, (_, i) => <span key={`r${i}`} className="absolute inset-x-0 h-px -translate-y-1/2 bg-white/45" style={{ top: pct(i + 1, grid.rows) }} />)}
            </span>
          )}
          {grid?.outline && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ borderRadius: rounding, boxShadow: `inset 0 0 0 ${Math.max(1, (grid.outline.width / (grid.cols * TILE)) * frameW)}px ${grid.outline.color}` }} />
          )}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 ring-1 ring-white/80" style={{ borderRadius: rounding }} />
          {corners.map((c) => (
            <span key={c} role="button" tabIndex={0} aria-label={`Resize from the ${{ nw: "top-left", ne: "top-right", sw: "bottom-left", se: "bottom-right" }[c]} corner`}
              onPointerDown={(e) => down(e, c)} onKeyDown={key(c)}
              style={{ width: handle, height: handle }}
              className={`pointer-events-none absolute rounded-md ${c[0] === "n" ? "top-0" : "bottom-0 -scale-y-100"} ${c[1] === "w" ? "left-0" : "right-0 -scale-x-100"} ${c === "nw" || c === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`}>
              {/* Drawn just inside the frame, so the handles stay whole when the frame meets the picture's edge.
                  Only the stroke (and a wide invisible band around it) takes the pointer, so a big arc does
                  not cover the middle of the frame, which drags the whole frame. */}
              <svg viewBox={`0 0 ${handle} ${handle}`} aria-hidden="true" className="size-full overflow-visible drop-shadow-[0_0_1.5px_rgb(0_0_0/0.5)]">
                <path d={bracket} fill="none" stroke="transparent" strokeWidth="22" strokeLinecap="round" pointerEvents="stroke" />
                <path d={bracket} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
              </svg>
            </span>
          ))}
        </div>
      </div>
      {animated && onTrim && <TrimBar source={loaded.source} start={start} length={duration} still={still} video={isVideo ? video : null} onTrim={onTrim} />}
    </div>
  );
}

const MIN_TRIM = 0.3;
const THUMBS = 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (t: number) => Math.round(t * 100) / 100;
const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

/** The clip's timeline under the picture: a filmstrip with a window of at most MAX_SECONDS that is dragged, or
 *  stretched by its handles. Only that window goes into the tiles, so a long video never yields a tile Telegram
 *  refuses as too long. With "Animated" off it becomes a marker that picks the one frame. */
function TrimBar({ source, start, length, still, video, onTrim }: {
  source: FrameSource; start: number; length: number; still: boolean; video: RefObject<HTMLVideoElement | null> | null; onTrim: (start: number, length: number) => void;
}) {
  const total = source.duration;
  const track = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  const thumbs = useRef<(HTMLCanvasElement | null)[]>([]);
  const drag = useRef<{ mode: "move" | "start" | "end"; x: number; start: number; length: number } | null>(null);
  const len = still ? 0 : clamp(Math.min(length, total - start), 0, MAX_SECONDS);
  const thumbH = 72;
  const thumbW = Math.round(thumbH * (source.width / source.height));

  useEffect(() => {
    let stop = false;
    (async () => {
      const times = Array.from({ length: THUMBS }, (_, i) => (total * (i + 0.5)) / THUMBS);
      let i = 0;
      try {
        for await (const image of source.frames(times)) {
          if (stop) break;
          const canvas = thumbs.current[i++];
          if (image && canvas) canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
        }
      } catch { /* the source was closed: a new file replaced it */ }
    })();
    return () => { stop = true; };
  }, [source, total]);

  useEffect(() => {
    const v = video?.current;
    const el = head.current;
    if (!v || !el || still) return;
    let frame = 0;
    const tick = () => { el.style.left = `${(v.currentTime / total) * 100}%`; frame = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [video, total, still]);

  function apply(mode: "move" | "start" | "end", s0: number, l0: number, dt: number) {
    if (still) return onTrim(round(clamp(s0 + dt, 0, Math.max(0, total - 0.1))), length);
    if (mode === "move") return onTrim(round(clamp(s0 + dt, 0, total - l0)), l0);
    if (mode === "start") {
      const end = s0 + l0;
      const s = round(clamp(s0 + dt, Math.max(0, end - MAX_SECONDS), Math.max(0, end - MIN_TRIM)));
      return onTrim(s, round(end - s));
    }
    onTrim(s0, round(clamp(l0 + dt, Math.min(MIN_TRIM, total - s0), Math.min(MAX_SECONDS, total - s0))));
  }

  function down(e: ReactPointerEvent, mode: "move" | "start" | "end") {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, start, length: len };
  }

  // A press on the strip outside the window centres the window there and keeps dragging it.
  function jump(e: ReactPointerEvent) {
    const r = track.current!.getBoundingClientRect();
    const at = ((e.clientX - r.left) / r.width) * total;
    const s = round(clamp(at - len / 2, 0, Math.max(0, total - (still ? 0.1 : len))));
    onTrim(s, still ? length : len);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode: "move", x: e.clientX, start: s, length: len };
  }

  function move(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const r = track.current!.getBoundingClientRect();
    apply(d.mode, d.start, d.length, ((e.clientX - d.x) / r.width) * total);
  }

  function key(mode: "move" | "start" | "end") {
    return (e: ReactKeyboardEvent) => {
      const step = e.shiftKey ? 0.5 : 0.1;
      const dt = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[e.key];
      if (dt === undefined) return;
      e.preventDefault();
      e.stopPropagation();
      apply(mode, start, len, dt);
    };
  }

  const pct = (t: number) => `${(t / total) * 100}%`;
  const veil = "bg-[color-mix(in_srgb,var(--tg-card)_68%,transparent)]";
  return (
    <div className="w-full px-1.5 pt-3">
      <div className="px-3.5">
        <div ref={track} onPointerDown={jump} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}
          className="relative h-12 cursor-pointer touch-none select-none">
          <div aria-hidden="true" className="tg-field absolute inset-0 flex overflow-hidden rounded-lg">
            {Array.from({ length: THUMBS }, (_, i) => (
              <canvas key={i} ref={(el) => { thumbs.current[i] = el; }} width={thumbW} height={thumbH} className="h-full min-w-0 flex-1 object-cover" />
            ))}
          </div>
          {/* The parts that are left out fade into the card. */}
          <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 rounded-l-lg ${veil}`} style={{ width: pct(start) }} />
          <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 rounded-r-lg ${veil}`} style={{ left: pct(start + len) }} />
          {still ? (
            <span role="slider" tabIndex={0} aria-label="Frame" aria-valuemin={0} aria-valuemax={round(total)} aria-valuenow={start} aria-valuetext={`${start.toFixed(1)} seconds`}
              onPointerDown={(e) => down(e, "move")} onKeyDown={key("move")}
              className="absolute -inset-y-1 w-3 -translate-x-1/2 cursor-ew-resize" style={{ left: pct(start) }}>
              <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-[var(--tg-accent)] ring-2 ring-white" />
            </span>
          ) : (
            <div role="slider" tabIndex={0} aria-label="Clip position" aria-valuemin={0} aria-valuemax={round(total - len)} aria-valuenow={start} aria-valuetext={`${clock(start)} to ${clock(start + len)}`}
              onPointerDown={(e) => down(e, "move")} onKeyDown={key("move")}
              className="absolute inset-y-0 cursor-grab border-y-[3px] border-[var(--tg-accent)] active:cursor-grabbing" style={{ left: pct(start), width: pct(len) }}>
              {(["start", "end"] as const).map((edge) => (
                <span key={edge} role="slider" tabIndex={0} aria-label={edge === "start" ? "Clip start" : "Clip end"}
                  aria-valuemin={0} aria-valuemax={round(total)} aria-valuenow={edge === "start" ? start : round(start + len)}
                  onPointerDown={(e) => down(e, edge)} onKeyDown={key(edge)}
                  className={`absolute -inset-y-[3px] flex w-3.5 cursor-ew-resize items-center justify-center bg-[var(--tg-accent)] ${edge === "start" ? "-left-3.5 rounded-l-lg" : "-right-3.5 rounded-r-lg"}`}>
                  <span className="h-4 w-[3px] rounded-full bg-white/90" />
                </span>
              ))}
            </div>
          )}
          {video && !still && <span ref={head} aria-hidden="true" className="pointer-events-none absolute -inset-y-1 w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)]" />}
        </div>
      </div>
      <div className="tg-hint mt-2 flex items-center justify-between gap-2 px-1.5 text-[12px] tabular-nums">
        <span className="font-medium text-[var(--tg-text)]">{still ? `Frame at ${clock(start)}` : `${clock(start)} – ${clock(start + len)}`}</span>
        <span>{still ? `of ${clock(total)}` : `${len.toFixed(1)} s of ${total.toFixed(1)} s · up to ${MAX_SECONDS} s`}</span>
      </div>
    </div>
  );
}
