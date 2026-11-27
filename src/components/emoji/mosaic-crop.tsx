"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Upload } from "lucide-react";
import { MAX_SECONDS, type Rect, TILE, clampCrop } from "@/lib/emoji-mosaic";
import type { FrameSource } from "@/lib/emoji-mosaic-encode";

export type Loaded = { file: File; url: string; source: FrameSource };
type Corner = "nw" | "ne" | "sw" | "se";
export const ACCEPT = "video/mp4,video/webm,video/quicktime,image/gif,image/png,image/jpeg,image/webp";

export function DropZone({ onFile }: { onFile: (file: File | undefined) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}
      className={`tg-field flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center ${over ? "border-[var(--tg-accent)]" : "border-transparent"}`}
    >
      <Upload aria-hidden="true" className="tg-accent size-8" />
      <span className="font-medium">Drop a video, GIF or picture</span>
      <span className="tg-hint text-[13px]">MP4, WebM, MOV, GIF, PNG, JPEG or WebP. Tiles are cut right here in your browser.</span>
      <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  );
}

export function CropView({ loaded, crop, aspect, grid = null, onCrop, start, duration, animated }: { loaded: Loaded; crop: Rect; aspect: number | null; grid?: { cols: number; rows: number; radius: number } | null; onCrop: (r: Rect) => void; start: number; duration: number; animated: boolean }) {
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
    <div className="flex items-center justify-center">
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
    </div>
  );
}
