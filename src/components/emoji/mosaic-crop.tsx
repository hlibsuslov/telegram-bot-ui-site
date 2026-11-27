"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Upload } from "lucide-react";
import { MAX_SECONDS, type Rect, clampCrop } from "@/lib/emoji-mosaic";
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

export function CropView({ loaded, crop, aspect, onCrop, start, duration, animated }: { loaded: Loaded; crop: Rect; aspect: number | null; onCrop: (r: Rect) => void; start: number; duration: number; animated: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const drag = useRef<{ mode: "move" | Corner; x: number; y: number; rect: Rect } | null>(null);
  const { width, height } = loaded.source;
  const isVideo = loaded.source.kind === "video";

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
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div ref={box} className="relative w-full touch-none select-none overflow-hidden rounded-xl bg-[repeating-conic-gradient(#8882_0_25%,transparent_0_50%)] bg-[length:16px_16px]" style={{ aspectRatio: `${width} / ${height}`, maxHeight: "var(--crop-max, 62vh)", maxWidth: `calc(var(--crop-max, 62vh) * ${width / height})` }} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
        {isVideo ? (
          <video ref={video} src={loaded.url} muted playsInline autoPlay={animated} loop className="pointer-events-none absolute inset-0 size-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset
          <img src={loaded.url} alt="" className="pointer-events-none absolute inset-0 size-full" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-black/45" style={{ clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${pct(crop.x, width)} ${pct(crop.y, height)},${pct(crop.x, width)} ${pct(crop.y + crop.h, height)},${pct(crop.x + crop.w, width)} ${pct(crop.y + crop.h, height)},${pct(crop.x + crop.w, width)} ${pct(crop.y, height)},${pct(crop.x, width)} ${pct(crop.y, height)})` }} />
        <div
          role="group" aria-label="Crop area" tabIndex={0} onPointerDown={(e) => down(e, "move")} onKeyDown={key("move")}
          className="absolute cursor-move outline-2 outline-white [box-shadow:0_0_0_1px_rgb(0_0_0/0.5)]"
          style={{ left: pct(crop.x, width), top: pct(crop.y, height), width: pct(crop.w, width), height: pct(crop.h, height), outlineStyle: "solid" }}
        >
          {corners.map((c) => (
            <span key={c} role="button" tabIndex={0} aria-label={`Resize from the ${{ nw: "top-left", ne: "top-right", sw: "bottom-left", se: "bottom-right" }[c]} corner`}
              onPointerDown={(e) => down(e, c)} onKeyDown={key(c)}
              className={`absolute size-5 rounded-full border-2 border-white bg-[var(--tg-accent)] ${c[0] === "n" ? "-top-2.5" : "-bottom-2.5"} ${c[1] === "w" ? "-left-2.5 " : "-right-2.5 "}${c === "nw" || c === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
