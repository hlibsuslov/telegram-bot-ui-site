"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Check, Download, ExternalLink, LoaderCircle, Minus, Pause, Play, Plus, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import {
  DEFAULT_FALLBACK,
  DEFAULT_SECONDS,
  FALLBACK_CHOICES,
  MAX_EMOJI,
  MAX_FPS,
  MAX_SECONDS,
  type Rect,
  TILE,
  autoGrid,
  centeredCrop,
  clampCrop,
  columnFit,
  gridOptions,
  isSingleEmoji,
  maxRadius,
} from "@/lib/emoji-mosaic";
import { zip } from "@/lib/emoji-mosaic-zip";
import type { EncodedMosaic, MosaicSettings } from "@/lib/emoji-mosaic-encode";
import { ACCEPT, CropView, DropZone, type Loaded } from "./mosaic-crop";

type Hosted = { enabled: boolean; bot?: string; user?: { id: number; name: string } | null };
type Encoded = EncodedMosaic & { key: string; zipUrl: string; zipName: string };
type Step =
  | { kind: "login" }
  | { kind: "encoding"; done: number; total: number; label: string }
  | { kind: "checking"; label: string }
  | { kind: "uploading"; done: number; total: number; wait?: number }
  | { kind: "done"; link: string; delivered: boolean }
  | { kind: "zip" }
  | { kind: "error"; message: string };

const MAX_FILE = 300 * 1024 * 1024;
const PICKER_COLS = 16;
const PICKER_ROWS = 16;
const FIT_LABEL = { safe: "fits every phone", "check-narrow-phone": "check on a narrow phone", "likely-wraps": "rows may wrap on phones" } as const;
/** Corner presets in mosaic pixels (a tile is 100). "Round" is always the most the grid allows. */
const CORNERS = [["none", "None", 0], ["small", "Small", 30], ["medium", "Medium", 60], ["large", "Large", 100], ["round", "Round", Infinity]] as const;
type Corners = (typeof CORNERS)[number][0];
const loadEncoder = () => import("@/lib/emoji-mosaic-encode");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function MosaicStudio() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(4);
  const [auto, setAuto] = useState({ cols: 8, rows: 4 });
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [locked, setLocked] = useState(true);
  const [corners, setCorners] = useState<Corners>("small");
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_SECONDS);
  const [fps, setFps] = useState(MAX_FPS);
  const [still, setStill] = useState(false);
  const [vp9, setVp9] = useState<boolean | null>(null);
  const [baseEmoji, setBaseEmoji] = useState(DEFAULT_FALLBACK);
  const [tileEmoji, setTileEmoji] = useState<Record<number, string>>({});
  const [dark, setDark] = useState(false);
  const [hosted, setHosted] = useState<Hosted>({ enabled: false });
  const [step, setStep] = useState<Step | null>(null);
  const encoded = useRef<Encoded | null>(null);
  const [lastEncoded, setLastEncoded] = useState<Encoded | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/mosaic/session").then((r) => r.json()).then((j: Hosted) => setHosted(j)).catch(() => {});
  }, []);

  const source = loaded?.source;
  const animated = !!source && source.duration > 0;
  const width = source?.width ?? 16;
  const height = source?.height ?? 9;
  const aspect = cols / rows;
  const count = cols * rows;
  const cornerOptions = CORNERS.filter(([key, , px]) => key === "round" || px < maxRadius(cols, rows));
  const cornerKey: Corners = cornerOptions.some(([key]) => key === corners) ? corners : "round";
  const radius = Math.min(CORNERS.find(([key]) => key === cornerKey)![2], maxRadius(cols, rows));
  const emoji = useMemo(() => Array.from({ length: count }, (_, i) => tileEmoji[i] ?? baseEmoji), [count, tileEmoji, baseEmoji]);
  const recommended = useMemo(() => gridOptions(width, height, { maxCols: PICKER_COLS, limit: 40 }).filter((o) => o.crop <= 0.05 && o.rows <= PICKER_ROWS), [width, height]);
  const settings: MosaicSettings = useMemo(() => ({ cols, rows, crop, fit: locked ? "cover" : "contain", radius, start, duration, fps, still: still || !animated, fallback: baseEmoji, emoji }), [cols, rows, crop, locked, radius, start, duration, fps, still, animated, baseEmoji, emoji]);
  const encodeKey = loaded ? JSON.stringify([loaded.url, cols, rows, crop, settings.fit, settings.radius, start, duration, fps, settings.still, emoji]) : "";

  async function open(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > MAX_FILE) return setError("That file is over 300 MB. Trim it to the few seconds you need first.");
    if (!ACCEPT.split(",").includes(file.type)) return setError("Use an MP4, WebM or MOV video, a GIF, or a PNG, JPEG or WebP picture.");
    setReading(true);
    try {
      const { openSource, canEncodeVp9 } = await loadEncoder();
      const [src, canVp9] = await Promise.all([openSource(file), canEncodeVp9()]);
      loaded?.source.dispose();
      if (loaded) URL.revokeObjectURL(loaded.url);
      const grid = autoGrid(src.width, src.height);
      setVp9(canVp9);
      setAuto(grid);
      setCols(grid.cols);
      setRows(grid.rows);
      setTileEmoji({});
      setCrop(centeredCrop(src.width, src.height, grid.cols / grid.rows));
      setLocked(true);
      setStart(0);
      setDuration(Math.min(DEFAULT_SECONDS, src.duration || DEFAULT_SECONDS));
      setStill(src.duration === 0 || !canVp9);
      setLoaded({ file, url: URL.createObjectURL(file), source: src });
    } catch (err) {
      setError(err instanceof Error ? err.message : "This file can't be read in this browser.");
    } finally {
      setReading(false);
    }
  }

  function setGrid(c: number, r: number) {
    const nr = Math.max(1, Math.min(r, Math.floor(MAX_EMOJI / c)));
    setCols(c);
    setRows(nr);
    setTileEmoji({});
    if (locked) setCrop((old) => clampCrop(old, width, height, c / nr));
  }

  function setShape(next: boolean) {
    setLocked(next);
    if (next) setCrop((old) => clampCrop(old, width, height, aspect));
  }

  const encode = useCallback(async (signal: AbortSignal): Promise<Encoded> => {
    if (encoded.current?.key === encodeKey) return encoded.current;
    const { encodeMosaic } = await loadEncoder();
    const result = await encodeMosaic(loaded!.file, loaded!.source, settings, (done, total, label) => setStep({ kind: "encoding", done, total, label }), signal);
    const folder = "emoji-mosaic";
    const text = new TextEncoder();
    const entries = [
      { name: `${folder}/mosaic.json`, data: text.encode(JSON.stringify(result.manifest, null, 2) + "\n") },
      { name: `${folder}/README.txt`, data: text.encode(readme(result)) },
      { name: `${folder}/preview.html`, data: text.encode(previewHtml(result)) },
      ...result.files.map((f) => ({ name: `${folder}/${f.name}`, data: f.data })),
    ];
    if (encoded.current) URL.revokeObjectURL(encoded.current.zipUrl);
    encoded.current = { ...result, key: encodeKey, zipName: `emoji-mosaic-${cols}x${rows}.zip`, zipUrl: URL.createObjectURL(new Blob([zip(entries)], { type: "application/zip" })) };
    setLastEncoded(encoded.current);
    return encoded.current;
  }, [encodeKey, loaded, settings, cols, rows]);

  const run = useCallback(async (user: Hosted["user"]) => {
    const controller = new AbortController();
    abort.current = controller;
    try {
      setStep({ kind: "encoding", done: 0, total: count, label: "Cutting tiles" });
      const result = await encode(controller.signal);
      if (!hosted.enabled || !user) return setStep({ kind: "zip" });
      setStep({ kind: "checking", label: "Checking the content" });
      const { sampleFrames } = await loadEncoder();
      const form = new FormData();
      form.set("count", String(count));
      form.set("cols", String(cols));
      form.set("format", result.manifest.format);
      for (const [i, frame] of (await sampleFrames(loaded!.source, settings)).entries()) form.append("frame", frame, `frame-${i}.jpg`);
      const pack = await api<{ job: string }>("/api/mosaic/pack", form);
      for (let i = 0; i < result.files.length; i++) {
        setStep({ kind: "uploading", done: i, total: result.files.length });
        for (let attempt = 0; ; attempt++) {
          if (controller.signal.aborted) throw new DOMException("Stopped", "AbortError");
          const form = new FormData();
          form.set("job", pack.job);
          form.set("index", String(i));
          form.set("emoji", emoji[i]);
          form.set("tile", new Blob([result.files[i].data], { type: result.manifest.format === "video" ? "video/webm" : "image/png" }), result.files[i].name.split("/").pop());
          const res = await fetch("/api/mosaic/tile", { method: "POST", body: form }).catch(() => null);
          const body = (await res?.json().catch(() => null)) as { ok?: boolean; error?: { message: string; retryAfter?: number | null } } | null;
          if (res?.ok && body?.ok) break;
          const wait = body?.error?.retryAfter ?? (res && res.status < 500 && res.status !== 429 ? null : 2);
          if (wait === null || attempt >= 8) throw new Error(body?.error?.message ?? "The upload failed.");
          setStep({ kind: "uploading", done: i, total: result.files.length, wait });
          await sleep(wait * 1000);
        }
      }
      setStep({ kind: "checking", label: "Checking the finished pack" });
      const done = await api<{ link: string; delivered: boolean }>("/api/mosaic/finish", { job: pack.job });
      setStep({ kind: "done", link: done.link, delivered: done.delivered });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return setStep(null);
      setStep({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      abort.current = null;
    }
  }, [count, cols, emoji, encode, hosted.enabled, loaded, settings]);

  function create() {
    if (hosted.enabled && !hosted.user) return setStep({ kind: "login" });
    void run(hosted.user);
  }

  async function onLogin(user: Record<string, unknown>) {
    try {
      const { user: me } = await api<{ user: { id: number; name: string } }>("/api/mosaic/session", user);
      setHosted((h) => ({ ...h, user: me }));
      void run(me);
    } catch (err) {
      setStep({ kind: "error", message: err instanceof Error ? err.message : "Login failed." });
    }
  }

  async function downloadZip() {
    const controller = new AbortController();
    abort.current = controller;
    try {
      setStep({ kind: "encoding", done: 0, total: count, label: "Cutting tiles" });
      const result = await encode(controller.signal);
      setStep(null);
      const a = Object.assign(document.createElement("a"), { href: result.zipUrl, download: result.zipName });
      a.click();
    } catch (err) {
      setStep(err instanceof DOMException && err.name === "AbortError" ? null : { kind: "error", message: err instanceof Error ? err.message : "Encoding failed." });
    } finally {
      abort.current = null;
    }
  }

  const fit = columnFit(cols);
  const ready = !!loaded && !reading;

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 px-1 pt-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Emoji mosaic</h1>
          <p className="tg-hint mt-1.5 text-[15px]">A clip or picture as a premium emoji pack. Sent as one message, the emoji rebuild it and play together.</p>
        </header>
        <DropZone onFile={open} />
        <p role="status" className="mt-3 text-center text-sm">{reading ? <span className="tg-hint">Reading the file…</span> : error && <span className="text-red-600 dark:text-red-400">{error}</span>}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="tg-bar sticky top-[4.5rem] z-30 flex min-h-14 items-center gap-2 rounded-2xl py-2 pr-2 pl-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] leading-tight font-semibold">Emoji mosaic</h1>
          <p className="tg-hint truncate text-[12px]">{cols} × {rows} = {count} emoji · {loaded.file.name}</p>
        </div>
        <label className="tg-cell tg-accent hidden h-9 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-sm sm:inline-flex" title="Choose another file">
          <Upload aria-hidden="true" className="size-4" /> Replace
          <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => open(e.target.files?.[0])} />
        </label>
        {hosted.enabled && (
          <button type="button" disabled={!ready} onClick={downloadZip} aria-label="Download the tiles as a ZIP" title="Download the tiles (ZIP)" className="tg-cell tg-accent inline-flex size-10 items-center justify-center rounded-xl">
            <Download aria-hidden="true" className="size-[18px]" />
          </button>
        )}
        <button type="button" disabled={!ready} onClick={create} className="tg-button inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold disabled:opacity-50">
          <Sparkles aria-hidden="true" className="size-[18px]" /> {hosted.enabled ? "Create pack" : "Make emoji"}
        </button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-5">
          <section aria-label="Crop" className="min-w-0 lg:col-start-1 lg:row-start-1 tg-glass relative flex flex-col rounded-2xl p-2 [--crop-max:48vh] lg:[--crop-max:58vh]">
            <CropView loaded={loaded} crop={crop} aspect={locked ? aspect : null} grid={locked ? { cols, rows, radius } : null} onCrop={setCrop} start={start} duration={duration} animated={animated} />
            <div className="flex items-center gap-2 px-1.5 pt-2 text-[12px]">
              <span className="tg-hint min-w-0 flex-1 truncate">Drag the frame or its corners{locked ? "; it keeps the grid's shape" : ""}.</span>
              <button type="button" onClick={() => setCrop(clampCrop(centeredCrop(width, height, aspect), width, height, locked ? aspect : null))} className="tg-cell tg-accent inline-flex h-7 items-center gap-1 rounded-lg px-2"><RotateCcw aria-hidden="true" className="size-3.5" /> Centre</button>
              <label className="tg-cell tg-accent inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2 sm:hidden"><Upload aria-hidden="true" className="size-3.5" /> Replace<input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => open(e.target.files?.[0])} /></label>
            </div>
          </section>
        <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Group title="Grid" action={(cols !== auto.cols || rows !== auto.rows) && <button type="button" onClick={() => setGrid(auto.cols, auto.rows)} className="tg-cell tg-accent rounded-lg px-2 py-0.5 text-[13px]">Auto · {auto.cols}×{auto.rows}</button>}
            footer={<><span className={fit === "safe" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>{FIT_LABEL[fit]}</span>. Dots fit your video&rsquo;s shape.</>}>
            <GridPicker cols={cols} rows={rows} recommended={recommended} onPick={setGrid} />
          </Group>

          <Group title="Shape">
            <Cell label="Fill every tile"><Switch label="Fill every tile" checked={locked} onChange={setShape} /></Cell>
            <div className="px-4 pt-2.5 pb-3">
              <p className="mb-2 text-[15px]">Rounded corners</p>
              <Segmented full label="Rounded corners" value={cornerKey} options={cornerOptions.map(([key, text]) => [key, text])} onChange={(v) => setCorners(v as Corners)} />
            </div>
          </Group>

          {animated && (
            <Group title="Motion" footer={vp9 === false ? "This browser can't encode VP9: the pack will be static. Chrome, Edge and Firefox can." : undefined}>
              <Cell label="Animated"><Switch label="Animated tiles" checked={!still} disabled={!vp9} onChange={(on) => setStill(!on)} /></Cell>
              <Cell label="Start" value={`${start.toFixed(2)} s`}>
                <Slider label="Start" min={0} max={Math.max(0, source!.duration - 0.1)} step={0.05} value={start} onChange={setStart} />
              </Cell>
              {!still && (
                <>
                  <Cell label="Length" value={`${Math.min(duration, source!.duration - start).toFixed(2)} s`}>
                    <Slider label="Length" min={0.3} max={MAX_SECONDS} step={0.05} value={duration} onChange={setDuration} />
                  </Cell>
                  <Cell label="Frame rate"><Segmented label="Frame rate" value={String(fps)} options={[["15", "15"], ["24", "24"], ["30", "30"]]} onChange={(v) => setFps(+v)} /></Cell>
                </>
              )}
            </Group>
          )}

          <Group title="Emoji behind the tiles" footer={`Shown where the premium emoji can't be. Pick one, then tap tiles to change them one by one. ${hosted.enabled ? "Tiles are cut on this device; only the finished tiles go to Telegram, under your account." : "Tiles are cut on this device; nothing is uploaded."}`}>
            <EmojiBehind cols={cols} emoji={emoji} base={baseEmoji} onBase={(e) => { setBaseEmoji(e); setTileEmoji({}); }} onTile={(i, e) => setTileEmoji((t) => ({ ...t, [i]: e }))} />
          </Group>

        </div>
          <section aria-label="Preview" className="min-w-0 lg:col-start-1 lg:row-start-2 relative overflow-hidden rounded-2xl">
            <Previews loaded={loaded} settings={settings} dark={dark} animated={animated && !settings.still}
              theme={<Segmented label="Chat theme" value={dark ? "dark" : "light"} options={[["light", "Light"], ["dark", "Dark"]]} onChange={(v) => setDark(v === "dark")} />} />
          </section>
      </div>

      {step && (
        <PackDialog step={step} hosted={hosted} encoded={lastEncoded} settings={settings} dark={dark} loaded={loaded}
          onLogin={onLogin} onClose={() => { abort.current?.abort(); setStep(null); }} />
      )}
    </div>
  );
}

async function api<T>(url: string, body: unknown): Promise<T> {
  const form = body instanceof FormData;
  const res = await fetch(url, { method: "POST", headers: form ? undefined : { "Content-Type": "application/json" }, body: form ? body : JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as ({ ok: boolean; error?: { message: string } } & T) | null;
  if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status}).`);
  return json;
}

// ------------------------------------------------------------------ grid picker

function GridPicker({ cols, rows, recommended, onPick }: { cols: number; rows: number; recommended: { cols: number; rows: number }[]; onPick: (c: number, r: number) => void }) {
  const [hover, setHover] = useState<{ c: number; r: number } | null>(null);
  const show = hover ?? { c: cols, r: rows };
  const over = show.c * show.r > MAX_EMOJI;
  const dots = new Set(recommended.map((o) => `${o.cols}x${o.rows}`));
  const pick = (c: number, r: number) => {
    const nc = Math.min(PICKER_COLS, Math.max(1, c));
    const nr = Math.min(PICKER_ROWS, Math.max(1, r));
    if (nc * nr <= MAX_EMOJI) onPick(nc, nr);
  };
  const key = (e: ReactKeyboardEvent) => {
    const moves: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    pick(cols + m[0], rows + m[1]);
  };
  return (
    <div className="p-3">
      <div className="relative mx-auto w-fit [--cell:16px] min-[400px]:[--cell:18px]">
        <div
          role="slider" tabIndex={0} aria-label="Grid size" aria-valuetext={`${cols} columns by ${rows} rows, ${cols * rows} emoji`} aria-valuenow={cols * rows} aria-valuemin={1} aria-valuemax={MAX_EMOJI}
          onKeyDown={key} onPointerLeave={() => setHover(null)}
          className="grid touch-none rounded-md"
          style={{ gridTemplateColumns: `repeat(${PICKER_COLS}, var(--cell))`, gridAutoRows: "var(--cell)", gap: 3 }}
        >
          {Array.from({ length: PICKER_ROWS * PICKER_COLS }, (_, i) => {
            const c = (i % PICKER_COLS) + 1;
            const r = Math.floor(i / PICKER_COLS) + 1;
            const allowed = c * r <= MAX_EMOJI;
            const inShow = c <= show.c && r <= show.r;
            const tone = !allowed
              ? "bg-[color-mix(in_srgb,var(--tg-text)_4%,transparent)]"
              : inShow
                ? hover ? (over ? "bg-red-500/40" : "bg-[color-mix(in_srgb,var(--tg-accent)_60%,transparent)]") : "bg-[var(--tg-accent)]"
                : "bg-[color-mix(in_srgb,var(--tg-text)_11%,transparent)]";
            return (
              <div key={i}
                onPointerEnter={() => setHover({ c, r })}
                onPointerDown={(e) => { e.preventDefault(); pick(c, r); }}
                className={`relative rounded-[4px] transition-colors ${tone} ${allowed ? "cursor-pointer" : "cursor-not-allowed"}`}>
                {dots.has(`${c}x${r}`) && <span className={`absolute inset-0 m-auto size-1 rounded-full ${inShow && allowed ? "bg-white" : "bg-[var(--tg-accent)]"}`} />}
              </div>
            );
          })}
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-[var(--tg-hint)] opacity-50" style={{ left: "calc(8 * (var(--cell) + 3px) - 2px)" }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Stepper label="Columns" value={cols} min={1} max={Math.min(PICKER_COLS, Math.floor(MAX_EMOJI / rows))} onChange={(c) => pick(c, rows)} />
          <X aria-hidden="true" className="tg-hint size-3.5" />
          <Stepper label="Rows" value={rows} min={1} max={Math.min(PICKER_ROWS, Math.floor(MAX_EMOJI / cols))} onChange={(r) => pick(cols, r)} />
        </div>
        <p aria-live="polite" className={`text-[13px] tabular-nums ${over ? "text-red-600 dark:text-red-400" : "tg-hint"}`}>
          {over ? `${show.c * show.r} — over ${MAX_EMOJI}` : `${show.c * show.r} emoji`}
        </p>
      </div>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="tg-field flex h-8 items-center rounded-full p-0.5" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="tg-cell inline-flex size-7 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-30"><Minus aria-hidden="true" className="size-3.5" /></button>
      <output className="w-6 text-center text-[15px] font-semibold tabular-nums">{value}</output>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="tg-cell inline-flex size-7 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-30"><Plus aria-hidden="true" className="size-3.5" /></button>
    </div>
  );
}

// ------------------------------------------------------------------ emoji behind the tiles

function EmojiBehind({ cols, emoji, base, onBase, onTile }: { cols: number; emoji: string[]; base: string; onBase: (e: string) => void; onTile: (i: number, e: string) => void }) {
  const [current, setCurrent] = useState(base);
  const [custom, setCustom] = useState("");
  const choose = (e: string) => { setCurrent(e); onBase(e); };
  return (
    <div>
      <div className="flex flex-wrap gap-1 px-3 pt-3" role="radiogroup" aria-label="Emoji">
        {FALLBACK_CHOICES.map((e) => (
          <button key={e} type="button" role="radio" aria-checked={current === e} onClick={() => choose(e)}
            className={`flex size-9 items-center justify-center rounded-xl text-xl transition-colors ${current === e ? "bg-[color-mix(in_srgb,var(--tg-accent)_18%,transparent)] ring-2 ring-[var(--tg-accent)]" : "tg-cell"}`}>{e}</button>
        ))}
        <input value={custom} placeholder="Other" aria-label="Another emoji" maxLength={16}
          onChange={(ev) => { setCustom(ev.target.value); if (isSingleEmoji(ev.target.value)) choose(ev.target.value.trim()); }}
          className={`tg-field h-9 w-20 rounded-xl px-2 text-center text-[15px] outline-none ${custom && !isSingleEmoji(custom) ? "ring-2 ring-red-500/60" : ""}`} />
      </div>
      <div className="tg-scroll-x overflow-x-auto px-3 py-3">
        <div className="grid w-fit gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }}>
          {emoji.map((e, i) => (
            <button key={i} type="button" onClick={() => onTile(i, current)} aria-label={`Tile ${Math.floor(i / cols) + 1}-${(i % cols) + 1}: ${e}. Set to ${current}`}
              className={`tg-field flex size-7 items-center justify-center rounded-md text-[15px] ${e !== base ? "ring-1 ring-[var(--tg-accent)]" : ""}`}>{e}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ previews

const POST = {
  title: "Something new this week",
  body: "We have refreshed the look of our channel and added a few small things to try. Thank you for reading along.",
};

function Previews({ loaded, settings, dark, animated, compact = false, theme: themeControl }: { loaded: Loaded; settings: MosaicSettings; dark: boolean; animated: boolean; compact?: boolean; theme?: ReactNode }) {
  const message = useRef<HTMLCanvasElement>(null);
  const post = useRef<HTMLCanvasElement>(null);
  const media = useRef<HTMLVideoElement & HTMLImageElement>(null);
  const [playing, setPlaying] = useState(() => typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const { cols, rows } = settings;
  const size = 22;
  // Recent Telegram clients draw a row of custom emoji edge to edge, so the tiles form one picture.
  const gapX = 0;
  const gapY = 0;
  const scale = 2;
  const w = cols * size + (cols - 1) * gapX;
  const h = rows * size + (rows - 1) * gapY;

  useEffect(() => {
    const el = media.current;
    const targets = [message.current, post.current].filter(Boolean) as HTMLCanvasElement[];
    if (!el || !targets.length) return;
    const mosaic = new OffscreenCanvas(cols * TILE, rows * TILE);
    const mctx = mosaic.getContext("2d")!;
    const video = el instanceof HTMLVideoElement ? el : null;
    const end = settings.start + Math.min(settings.duration, MAX_SECONDS);
    let frame = 0;
    let stop = false;
    if (video) startVideo(video, settings.start, animated && playing);
    const paint = () => {
      if (stop) return;
      if (video && animated && video.currentTime >= end) startVideo(video, settings.start, true);
      const ready = video ? video.readyState >= 2 : (el as HTMLImageElement).complete;
      if (ready) drawMosaicSync(mctx, el, settings);
      for (const canvas of targets) {
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!ready) continue;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) ctx.drawImage(mosaic, c * TILE, r * TILE, TILE, TILE, c * (size + gapX) * scale, r * (size + gapY) * scale, size * scale, size * scale);
      }
      if (animated && playing) frame = requestAnimationFrame(paint);
    };
    paint();
    const again = () => paint();
    el.addEventListener(video ? "seeked" : "load", again);
    video?.addEventListener("loadeddata", again);
    return () => { stop = true; cancelAnimationFrame(frame); el.removeEventListener(video ? "seeked" : "load", again); video?.removeEventListener("loadeddata", again); video?.pause(); };
  }, [loaded, settings.crop, settings.fit, settings.radius, settings.start, settings.duration, cols, rows, animated, playing, compact]); // eslint-disable-line react-hooks/exhaustive-deps -- settings is rebuilt each render; its fields are listed

  const canvasProps = { width: w * scale, height: h * scale, style: { width: w, height: h }, className: "block max-w-none" };
  const theme = dark ? { wall: "bg-[#0e1621]", bubble: "bg-[#182533] text-white", hint: "text-[#6d8299]", link: "text-[#71baf9]" } : { wall: "bg-[#dfe6ee]", bubble: "bg-white text-black", hint: "text-[#a1aab3]", link: "text-[#168acd]" };
  return (
    <div className={`${theme.wall} relative`}>
      {loaded.source.kind === "video"
        ? <video ref={media} src={loaded.url} muted playsInline preload="auto" aria-hidden="true" className="pointer-events-none fixed top-0 left-0 size-px opacity-0" />
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL, drawn into the canvases
        : <img ref={media} src={loaded.url} alt="" aria-hidden="true" className="pointer-events-none fixed top-0 left-0 size-px opacity-0" />}
      {(themeControl || animated) && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {animated && (
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause the preview" : "Play the preview"} className="inline-flex size-8 items-center justify-center rounded-full bg-black/30 text-white">
              {playing ? <Pause aria-hidden="true" className="size-3.5" /> : <Play aria-hidden="true" className="size-3.5" />}
            </button>
          )}
          {themeControl}
        </div>
      )}
      <div className={`grid gap-4 p-4 pt-14 ${compact ? "" : "md:grid-cols-2"}`}>
        <figure className="min-w-0">
          <figcaption className={`mb-2 text-[12px] font-medium ${theme.hint}`}>Message</figcaption>
          <div className={`tg-scroll-x w-fit max-w-full overflow-x-auto rounded-2xl rounded-bl-md px-3 pt-2.5 pb-1.5 shadow-sm ${theme.bubble}`}>
            <canvas ref={message} {...canvasProps} role="img" aria-label={`The ${cols} by ${rows} mosaic as a message`} />
            <p className={`mt-1 text-right text-[11px] ${theme.hint}`}>12:00</p>
          </div>
        </figure>
        {!compact && (
          <figure className="min-w-0">
            <figcaption className={`mb-2 text-[12px] font-medium ${theme.hint}`}>In a post</figcaption>
            <div className={`tg-scroll-x w-fit max-w-full overflow-x-auto rounded-2xl rounded-bl-md px-3 pt-2.5 pb-1.5 text-[14px] leading-[1.35] shadow-sm ${theme.bubble}`}>
              <p className="font-semibold">{POST.title}</p>
              <canvas ref={post} {...canvasProps} className="my-2 block max-w-none" role="img" aria-label="The mosaic inside a channel post" />
              <p className="max-w-[30ch]">{POST.body}</p>
              <p className={`mt-0.5 text-right text-[11px] ${theme.hint}`}>👁 1.2K · 12:00</p>
            </div>
          </figure>
        )}
      </div>
    </div>
  );
}

function startVideo(video: HTMLVideoElement, at: number, play: boolean) {
  video.currentTime = at;
  if (play) void video.play().catch(() => {});
  else video.pause();
}

function drawMosaicSync(ctx: OffscreenCanvasRenderingContext2D, image: CanvasImageSource, s: MosaicSettings) {
  const width = s.cols * TILE;
  const height = s.rows * TILE;
  const scale = s.fit === "cover" ? Math.max(width / s.crop.w, height / s.crop.h) : Math.min(width / s.crop.w, height / s.crop.h);
  const dw = s.crop.w * scale;
  const dh = s.crop.h * scale;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, s.crop.x, s.crop.y, s.crop.w, s.crop.h, (width - dw) / 2, (height - dh) / 2, dw, dh);
  if (s.radius > 0) {
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, s.radius);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ the pack dialog

function PackDialog({ step, hosted, encoded, settings, dark, loaded, onLogin, onClose }: {
  step: Step; hosted: Hosted; encoded: Encoded | null; settings: MosaicSettings; dark: boolean; loaded: Loaded;
  onLogin: (user: Record<string, unknown>) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);
  const working = step.kind === "encoding" || step.kind === "uploading" || step.kind === "checking";
  const percent = step.kind === "encoding" || step.kind === "uploading" ? Math.round((step.done / Math.max(1, step.total)) * 100) : 100;
  return (
    <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby="pack-dialog-title"
      className="tg m-auto w-[min(460px,calc(100vw-24px))] overflow-hidden rounded-3xl bg-transparent p-0 text-[var(--tg-text)] backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <div className="tg-glass-strong rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 id="pack-dialog-title" className="text-[17px] font-semibold">
            {step.kind === "login" ? "Log in to create the pack" : step.kind === "done" ? "Your pack is ready" : step.kind === "zip" ? "Your tiles are ready" : step.kind === "error" ? "The pack wasn't finished" : "Making your pack"}
          </h2>
          <button type="button" onClick={onClose} aria-label={working ? "Stop and close" : "Close"} className="tg-cell inline-flex size-8 items-center justify-center rounded-full"><X aria-hidden="true" className="size-4" /></button>
        </div>

        <div className="mt-3 overflow-hidden">
          <Previews loaded={loaded} settings={settings} dark={dark} animated={!settings.still} compact />
        </div>

        <div className="space-y-3 px-5 py-4 text-[15px]">
          {step.kind === "login" && hosted.bot && (
            <>
              <p className="tg-hint text-sm">The pack is created under your Telegram account, and @{hosted.bot} sends you the mosaic. Telegram shows the login; this site never sees your password or phone number.</p>
              <TelegramLogin bot={hosted.bot} onAuth={onLogin} />
            </>
          )}
          {working && (
            <div role="status" aria-live="polite">
              <div className="flex items-center gap-2">
                <LoaderCircle aria-hidden="true" className="tg-accent size-4 animate-spin" />
                <span>
                  {step.kind === "encoding" ? `${step.label}… ${step.done} of ${step.total}` : step.kind === "checking" ? `${step.label}…` : step.wait ? `Telegram asks to wait ${step.wait} s…` : `Adding emoji to the pack… ${step.done} of ${step.total}`}
                </span>
              </div>
              <div className="tg-field mt-2 h-1.5 overflow-hidden rounded-full"><div className="h-full bg-[var(--tg-accent)] transition-[width]" style={{ width: `${percent}%` }} /></div>
            </div>
          )}
          {step.kind === "done" && (
            <>
              <p className="flex items-start gap-2"><Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-500" /> {step.delivered ? "The mosaic is in your chat with the bot. Copy it into a post or a message." : "The pack is ready, but Telegram showed the mosaic without the premium emoji (the bot can't use custom emoji in your chat). Add the pack and type the emoji in order."}</p>
              <a href={step.link} target="_blank" rel="noreferrer" className="tg-button flex h-12 items-center justify-center gap-2 rounded-2xl font-semibold"><ExternalLink aria-hidden="true" className="size-[18px]" /> Add the pack in Telegram</a>
            </>
          )}
          {step.kind === "zip" && (
            <p className="tg-hint text-sm">Turn the ZIP into a pack with your own bot: ask an agent with the telegram-bot-ui skill to &ldquo;make an emoji pack from this ZIP&rdquo;, or follow its README.</p>
          )}
          {step.kind === "error" && <p className="text-red-600 dark:text-red-400">{step.message}</p>}
          {encoded && !working && step.kind !== "login" && (
            <a href={encoded.zipUrl} download={encoded.zipName} className={`${step.kind === "zip" ? "tg-button h-12 font-semibold" : "tg-cell tg-accent h-10 text-sm font-medium"} flex items-center justify-center gap-1.5 rounded-2xl`}>
              <Download aria-hidden="true" className="size-4" /> Download the tiles · {encoded.zipName}
            </a>
          )}
        </div>
      </div>
    </dialog>
  );
}

function TelegramLogin({ bot, onAuth }: { bot: string; onAuth: (user: Record<string, unknown>) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const callback = useRef(onAuth);
  useEffect(() => { callback.current = onAuth; }, [onAuth]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    (window as unknown as { onMosaicTelegramAuth?: (u: Record<string, unknown>) => void }).onMosaicTelegramAuth = (u) => callback.current(u);
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    Object.assign(script.dataset, { telegramLogin: bot, size: "large", radius: "12", requestAccess: "write", userpic: "false", onauth: "onMosaicTelegramAuth(user)" });
    el.appendChild(script);
    return () => { el.replaceChildren(); };
  }, [bot]);
  return <div ref={box} className="flex min-h-12 justify-center" />;
}

// ------------------------------------------------------------------ Telegram-style list parts

function Group({ title, footer, action, children }: { title: string; footer?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="flex min-h-8 items-end justify-between gap-2 px-4 pb-1.5">
        <h2 className="tg-section-title uppercase">{title}</h2>
        {action}
      </div>
      <div className="tg-glass tg-sep overflow-hidden rounded-2xl">{children}</div>
      {footer && <p className="tg-hint px-4 pt-1.5 text-[13px] leading-snug">{footer}</p>}
    </section>
  );
}

function Cell({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  if (value !== undefined) {
    return (
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between text-[15px]"><span>{label}</span><span className="tg-hint tabular-nums">{value}</span></div>
        <div className="mt-1.5">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-1.5">
      <span className="text-[15px]">{label}</span>
      {children}
    </div>
  );
}

function Switch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-[var(--tg-accent)]" : "bg-[color-mix(in_srgb,var(--tg-text)_16%,transparent)]"}`}>
      <span className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgb(0_0_0/0.2)] transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Segmented({ label, value, options, full = false, onChange }: { label: string; value: string; options: [string, string][]; full?: boolean; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className={`tg-field flex rounded-[10px] p-0.5 text-[13px] ${full ? "w-full" : ""}`}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`h-7 min-w-10 rounded-lg px-2.5 font-medium transition-colors ${full ? "flex-1" : ""} ${value === v ? "tg-glass-strong shadow-sm" : "tg-hint hover:text-[var(--tg-text)]"}`}>{text}</button>
      ))}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)}
      className="tg-range w-full" style={{ "--fill": `${fill}%` } as CSSProperties} />
  );
}

// ------------------------------------------------------------------ files in the ZIP

function readme({ manifest }: EncodedMosaic): string {
  const { cols, rows } = manifest.grid;
  return `Telegram emoji mosaic: ${cols}x${rows}, ${manifest.tiles.length} ${manifest.format} tiles
Made at telegram-bot-ui.hlixli.com/emoji/mosaic. Schema: ${manifest.schema}.

tiles/ go row by row, left to right: r01c01, r01c02, ... Open preview.html to see them together.
mosaic.json lists the emoji behind each tile ("emoji").

Make the pack with your own bot (your token stays on your machine):

  1. Create a bot with @BotFather (or use one you have) and write /start to it from the account
     that will own the pack. Your numeric user id: @userinfobot.
  2. With the telegram-bot-ui skill (https://github.com/hlibsuslov/telegram-bot-ui):
       py -3 <skill>/scripts/tgui.py mosaic check emoji-mosaic-${cols}x${rows}.zip
       TELEGRAM_LIVE=1 TELEGRAM_TEST_BOT_TOKEN=<token> py -3 <skill>/scripts/tgui.py mosaic publish emoji-mosaic-${cols}x${rows}.zip --owner <your id> --title "My mosaic"
     Or ask your agent: "make an emoji pack from emoji-mosaic-${cols}x${rows}.zip".
  3. Copy the message the bot sends into a channel post (Telegram Premium lets you use the set).

By hand instead: in @Stickers send /newemojipack and send the tiles in the order above.
`;
}

function previewHtml({ manifest }: EncodedMosaic): string {
  const cell = (name: string) => (manifest.format === "video" ? `<video src="${name}" autoplay loop muted playsinline></video>` : `<img src="${name}" alt="">`);
  const cells = manifest.tiles.map(cell).join("");
  return `<!doctype html><meta charset="utf-8"><title>Emoji mosaic preview</title>
<style>body{font:14px system-ui,sans-serif;margin:24px}.b{display:inline-block;padding:16px;border-radius:16px;margin:0 16px 16px 0}
.l{background:#fff;box-shadow:0 0 0 1px #ddd}.d{background:#182533}.g{display:grid;grid-template-columns:repeat(${manifest.grid.cols},44px)}
.o .g{column-gap:2px;row-gap:10px}.g>*{width:44px;height:44px;display:block}</style>
<p>${manifest.grid.cols}&times;${manifest.grid.rows} mosaic at 2x: edge to edge as newer Telegram clients draw it, and with the gaps older clients leave.</p>
<div class="b l"><div class="g">${cells}</div></div><div class="b d"><div class="g">${cells}</div></div><div class="b l o"><div class="g">${cells}</div></div>
`;
}
