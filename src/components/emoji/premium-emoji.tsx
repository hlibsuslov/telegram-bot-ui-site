"use client";

// One premium emoji as Telegram draws it: a still picture that comes alive on hover or focus
// (or always, when `play` is "always" and it is on screen). Animated (TGS) emoji are Lottie,
// fetched and decompressed only when they first play; video emoji show their thumbnail and load
// the WEBM only to play; static ones are a picture.
//
// A library page shows about a thousand of these, so the still keeps no React state: whether the
// picture has loaded or failed is written on the DOM (data-ready, data-broken) and drawn by CSS
// (emoji.css). The player is a separate component that exists only while the emoji plays.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent, type ReactNode, type Ref } from "react";
import type { EmojiData } from "@/lib/emoji-card";
import { cn } from "@/lib/utils";

export type { EmojiData };

type LottieItem = {
  destroy(): void; goToAndStop(value: number, isFrame: boolean): void; addEventListener(name: "DOMLoaded", cb: () => void): void;
  isLoaded: boolean; totalFrames: number; frameRate: number;
};
type LottiePlayer = { loadAnimation(o: { container: Element; renderer: "svg" | "canvas"; loop: boolean; autoplay: boolean; animationData: unknown }): LottieItem };

const players = new Map<string, Promise<LottiePlayer>>();
const animations = new Map<string, Promise<unknown>>();

/** SVG Lottie on a desktop; canvas on touch screens, where many SVG animations at once stutter. */
function loadPlayer(canvas: boolean): Promise<LottiePlayer> {
  const key = canvas ? "canvas" : "svg";
  let p = players.get(key);
  if (!p) {
    p = (canvas ? import("lottie-web/build/player/lottie_light_canvas") : import("lottie-web/build/player/lottie_light"))
      .then((m) => (m.default ?? m) as unknown as LottiePlayer);
    players.set(key, p);
  }
  return p;
}

type LottieLayer = { ty?: number; shapes?: LottieShape[] };
type LottieShape = { ty?: string; it?: LottieShape[] };

/** Telegram stores TGS with empty arrays left out (a shape layer without `shapes`, a group without
 *  `it`), and lottie-web reads their length unguarded: it threw on real packs, so no TGS emoji ever
 *  moved. Put the empty arrays back. */
function completeTgs(data: { layers?: LottieLayer[]; assets?: { layers?: LottieLayer[] }[] }) {
  const shapes = (list: LottieShape[]) => {
    for (const s of list) if (s.ty === "gr") shapes((s.it ??= []));
  };
  const layers = (list: LottieLayer[]) => {
    for (const l of list) if (l.ty === 4) shapes((l.shapes ??= []));
  };
  layers((data.layers ??= []));
  for (const a of data.assets ?? []) if (a.layers) layers(a.layers);
  return data;
}

/** A TGS file is gzip-compressed Lottie JSON; the browser's DecompressionStream opens it. */
function loadAnimation(url: string): Promise<unknown> {
  let p = animations.get(url);
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (!res.ok || !res.body) throw new Error(`animation: HTTP ${res.status}`);
      const text = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
      return completeTgs(JSON.parse(text));
    });
    p.catch(() => animations.delete(url));
    // Keep the last few decoded animations only: a long browse would otherwise hold them all.
    if (animations.size >= 64) animations.delete(animations.keys().next().value as string);
    animations.set(url, p);
  }
  return p;
}

const HOVER = "(hover: hover)";
const subscribeHover = (cb: () => void) => {
  const m = matchMedia(HOVER);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** Whether the main pointer can hover (a mouse). Touch screens play on tap instead. The server
 *  renders for a mouse; a touch screen corrects it right after hydration. */
export function useCanHover(): boolean {
  return useSyncExternalStore(subscribeHover, () => matchMedia(HOVER).matches, () => true);
}

/** A mouse pointer, not a finger: a tap fires pointerenter too, and must not start a hover preview. */
export const isMouse = (e: PointerEvent) => e.pointerType === "mouse";

// One IntersectionObserver for every emoji that plays while visible, instead of one each.
const watched = new Map<Element, (visible: boolean) => void>();
let observer: IntersectionObserver | null = null;
function watch(el: Element, onChange: (visible: boolean) => void): () => void {
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) watched.get(e.target)?.(e.isIntersecting);
  }, { rootMargin: "40px" });
  watched.set(el, onChange);
  observer.observe(el);
  return () => {
    watched.delete(el);
    observer?.unobserve(el);
  };
}

const ready = (el: Element) => el.parentElement?.setAttribute("data-ready", "");

/** A busy resolver (429, not cached) or a cold picture can fail once: ask the same URL again twice,
 *  a little later each time, before falling back to the ordinary emoji. */
function retry(el: HTMLImageElement | HTMLVideoElement) {
  const tries = Number(el.dataset.tries ?? 0);
  if (tries >= 2) {
    el.parentElement?.setAttribute("data-broken", "");
    return;
  }
  el.dataset.tries = String(tries + 1);
  const src = el.getAttribute("src");
  setTimeout(() => { if (src && el.isConnected) el.setAttribute("src", src); }, 700 * (tries + 1));
}

/** A picture can finish (or fail) before hydration attaches onLoad: then ask the element itself. */
function settled(el: HTMLImageElement | HTMLVideoElement | null) {
  if (!el) return;
  if (el instanceof HTMLVideoElement) {
    if (el.readyState >= 2) ready(el);
  } else if (el.complete && el.getAttribute("src")) {
    if (el.naturalWidth > 0) ready(el);
    else retry(el);
  }
}

const TONE = { light: "*:brightness-0", dark: "*:brightness-0 *:invert", page: "*:brightness-0 dark:*:invert" } as const;

/** The still picture of an emoji, with room for a player on top (children). No hooks: cheap enough
 *  for a thousand on a page. */
export function EmojiStill({
  emoji, size = 40, tone, className, children, ref, onPointerEnter, onPointerLeave,
}: {
  emoji: EmojiData; size?: number;
  /** draw adaptive emoji for this theme instead of the page's (theme previews) */
  tone?: "light" | "dark";
  className?: string; children?: ReactNode; ref?: Ref<HTMLSpanElement>;
  onPointerEnter?: (e: PointerEvent) => void; onPointerLeave?: (e: PointerEvent) => void;
}) {
  const picture = emoji.format === "video" ? emoji.still : emoji.preview;
  // A video emoji without a thumbnail: the WEBM is the still, as before thumbnails were used.
  const videoStill = emoji.format === "video" && !emoji.still ? emoji.preview : null;
  return (
    <span
      // A new picture is a new element, so the ready/broken marks of the old one do not carry over.
      key={picture ?? videoStill ?? emoji.id}
      ref={ref}
      // Adaptive emoji take the text color, as in Telegram: black on light, white on dark.
      className={cn("tg-emoji", emoji.adaptive && TONE[tone ?? "page"], className)}
      style={{ "--emoji-size": `${size}px` } as CSSProperties}
      data-fallback={emoji.fallback || "□"}
      data-broken={picture || videoStill ? undefined : ""}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element -- pictures come from the resolver API, sized by the grid
        <img
          ref={settled} src={picture} alt="" loading="lazy" decoding="async" fetchPriority="low" draggable={false}
          className="tg-emoji-still"
          onLoad={(e) => ready(e.currentTarget)} onError={(e) => retry(e.currentTarget)}
        />
      ) : videoStill ? (
        <video
          ref={settled} src={videoStill} muted playsInline preload="metadata" aria-hidden="true"
          className="tg-emoji-still"
          onLoadedData={(e) => ready(e.currentTarget)} onError={(e) => retry(e.currentTarget)}
        />
      ) : null}
      {children}
    </span>
  );
}

// Starting a Lottie player builds its whole scene at once. "Play all" or a hovered card starts dozens
// together, which on a phone was one long frozen frame: start them a few per frame instead, within a
// small time budget, so scrolling and taps keep running in between.
const starts: (() => void)[] = [];
let startsScheduled = false;
function runStarts() {
  const end = performance.now() + 8;
  while (starts.length && performance.now() < end) starts.shift()!();
  if (starts.length) requestAnimationFrame(runStarts);
  else startsScheduled = false;
}
function inFrames(start: () => void) {
  starts.push(start);
  if (!startsScheduled) {
    startsScheduled = true;
    requestAnimationFrame(runStarts);
  }
}

// On a touch screen one shared clock drives every player at 30 frames a second, half of them on each
// display frame: a phone with "Play all" on draws a quarter of what 60 fps for all would cost, and
// every emoji still moves. Desktops keep lottie-web's own 60 fps loop.
const FPS = 30;
const clocked = new Map<LottieItem, number>(); // player -> its start time
let clockFrame = 0;
let clockRunning = false;
function clockTick(now: number) {
  let i = 0;
  clockFrame++;
  for (const [item, start] of clocked) {
    if (i++ % 2 !== clockFrame % 2 || !item.isLoaded) continue;
    const frame = Math.floor(((now - start) / 1000) * FPS) * (item.frameRate / FPS);
    item.goToAndStop(frame % item.totalFrames, true);
  }
  if (clocked.size) requestAnimationFrame(clockTick);
  else clockRunning = false;
}
function clock(item: LottieItem): () => void {
  clocked.set(item, performance.now());
  if (!clockRunning) {
    clockRunning = true;
    requestAnimationFrame(clockTick);
  }
  return () => clocked.delete(item);
}

/** The moving emoji over its still, mounted only while it plays: the Lottie player or the WEBM. */
export function EmojiMotion({ emoji }: { emoji: EmojiData }) {
  const stage = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    const el = stage.current ?? v;
    const box = el?.parentElement;
    if (!el || !box) return;
    // The still hides only once something moves over it, so there is never a blank square.
    const show = () => box.setAttribute("data-playing", "");
    let item: LottieItem | null = null;
    let unclock: (() => void) | null = null;
    let cancelled = false;
    if (v) {
      v.addEventListener("playing", show);
      void v.play().catch(() => undefined);
    } else if (emoji.animation) {
      const canvas = !matchMedia(HOVER).matches;
      Promise.all([loadPlayer(canvas), loadAnimation(emoji.animation)]).then(([lottie, data]) => {
        inFrames(() => {
          if (cancelled || !stage.current) return;
          item = lottie.loadAnimation({ container: stage.current, renderer: canvas ? "canvas" : "svg", loop: true, autoplay: !canvas, animationData: data });
          if (canvas) unclock = clock(item);
          // Reveal it once its first frame is drawn, so the still never gives way to an empty square.
          if (item.isLoaded) show();
          else item.addEventListener("DOMLoaded", show);
        });
      }).catch(() => undefined);
    }
    return () => {
      cancelled = true;
      unclock?.();
      item?.destroy();
      box.removeAttribute("data-playing");
      if (v) {
        // Let go of the decoder now, not when the element is collected: phones have few.
        v.removeEventListener("playing", show);
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
    };
  }, [emoji.animation]);

  if (emoji.format === "video" && emoji.preview) {
    return (
      <video
        ref={video} src={emoji.preview} muted loop playsInline preload="auto" aria-hidden="true"
        className="tg-emoji-motion pointer-events-none absolute inset-0 size-full object-contain"
      />
    );
  }
  if (emoji.format === "animated" && emoji.animation) {
    return <span ref={stage} aria-hidden="true" className="tg-emoji-motion pointer-events-none absolute inset-0 [&_canvas]:!size-full [&_svg]:!size-full" />;
  }
  return null;
}

export function PremiumEmoji({
  emoji, play = "hover", active: forced, className, size = 40, tone,
}: {
  emoji: EmojiData;
  /** hover: plays while the mouse is over it (or `active`); always: plays while visible */
  play?: "hover" | "always";
  /** a parent that tracks hover itself (a whole tile) passes it here */
  active?: boolean;
  className?: string;
  size?: number;
  /** draw adaptive emoji for this theme instead of the page's (theme previews) */
  tone?: "light" | "dark";
}) {
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const watchRef = useCallback((el: HTMLSpanElement | null) => (el && play === "always" ? watch(el, setVisible) : undefined), [play]);
  const on = emoji.format !== "static" && (play === "always" ? visible : forced ?? hover);
  return (
    <EmojiStill
      ref={watchRef} emoji={emoji} size={size} tone={tone} className={className}
      onPointerEnter={(e) => isMouse(e) && setHover(true)} onPointerLeave={() => setHover(false)}
    >
      {on ? <EmojiMotion emoji={emoji} /> : null}
    </EmojiStill>
  );
}
