"use client";

// One premium emoji as Telegram draws it: a still picture that comes alive on hover or focus
// (or always, when `play` is "always" and it is on screen). Animated (TGS) emoji are Lottie,
// fetched and decompressed only when they first play; video emoji are WEBM; static ones a picture.
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type EmojiData = {
  id: string; fallback: string; format: "static" | "animated" | "video";
  preview: string | null; animation: string | null;
  /** needs_repainting: Telegram draws it in the text color (single-color icon packs) */
  adaptive?: boolean;
};

type LottieItem = { destroy(): void };
type LottiePlayer = { loadAnimation(o: { container: Element; renderer: "svg"; loop: boolean; autoplay: boolean; animationData: unknown }): LottieItem };

let player: Promise<LottiePlayer> | null = null;
const animations = new Map<string, Promise<unknown>>();

function loadPlayer(): Promise<LottiePlayer> {
  player ??= import("lottie-web/build/player/lottie_light").then((m) => (m.default ?? m) as unknown as LottiePlayer);
  return player;
}

/** A TGS file is gzip-compressed Lottie JSON; the browser's DecompressionStream opens it. */
function loadAnimation(url: string): Promise<unknown> {
  let p = animations.get(url);
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (!res.ok || !res.body) throw new Error(`animation: HTTP ${res.status}`);
      const text = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
      return JSON.parse(text) as unknown;
    });
    p.catch(() => animations.delete(url));
    animations.set(url, p);
  }
  return p;
}

export function PremiumEmoji({
  emoji, play = "hover", active: forced, className, size = 40, tone,
}: {
  emoji: EmojiData;
  /** hover: plays while hovered or focused (inside an element with `group/emoji`, or the emoji itself); always: plays while visible */
  play?: "hover" | "always";
  /** a parent that tracks hover itself (a whole tile) passes it here */
  active?: boolean;
  className?: string;
  size?: number;
  /** draw adaptive emoji for this theme instead of the page's (theme previews) */
  tone?: "light" | "dark";
}) {
  const box = useRef<HTMLSpanElement>(null);
  const stage = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState(false);
  const [tries, setTries] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const want = forced ?? hover;
  const on = (play === "always" ? visible : want) && emoji.format !== "static";

  useEffect(() => {
    if (play !== "always" || !box.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [play]);

  useEffect(() => {
    if (emoji.format !== "animated" || !emoji.animation || !on || !stage.current) return;
    let item: LottieItem | null = null;
    let cancelled = false;
    Promise.all([loadPlayer(), loadAnimation(emoji.animation)]).then(([lottie, data]) => {
      if (cancelled || !stage.current) return;
      item = lottie.loadAnimation({ container: stage.current, renderer: "svg", loop: true, autoplay: true, animationData: data });
      setPlaying(true);
    }).catch(() => setPlaying(false));
    return () => {
      cancelled = true;
      item?.destroy();
      setPlaying(false);
    };
  }, [on, emoji.format, emoji.animation]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (on) void v.play().catch(() => undefined);
    else { v.pause(); v.currentTime = 0; }
  }, [on]);

  // A picture can finish loading before hydration attaches onLoad: then the event is gone, so ask
  // the element itself (an external system) whether it already has the picture.
  useEffect(() => {
    const done = (img.current?.complete && img.current.naturalWidth > 0) || (video.current?.readyState ?? 0) >= 2;
    if (done) setLoaded(true);
  }, [tries]);

  const style = { width: size, height: size };
  const still = emoji.preview && !broken;
  // A busy resolver (429) or a cold picture can fail once: try again twice, a little later each
  // time, before falling back to the ordinary emoji. `r` makes the browser ask again.
  const src = emoji.preview ? (tries ? `${emoji.preview}?r=${tries}` : emoji.preview) : undefined;
  const failed = () => {
    if (tries >= 2) { setBroken(true); return; }
    setTimeout(() => setTries((t) => t + 1), 700 * (tries + 1));
  };
  return (
    <span
      ref={box}
      className={cn(
        "relative inline-block shrink-0",
        // Adaptive emoji take the text color, as in Telegram: black on light, white on dark.
        emoji.adaptive && still && (tone === "light" ? "brightness-0" : tone === "dark" ? "brightness-0 invert" : "brightness-0 dark:invert"),
        className,
      )}
      style={style}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {still && !loaded ? (
        <span aria-hidden="true" className="absolute inset-[12%] animate-pulse rounded-[30%] bg-current opacity-[0.07] motion-reduce:animate-none" />
      ) : null}
      {emoji.format === "video" && still ? (
        <video
          key={src} ref={video} src={src} muted loop playsInline preload="metadata" aria-hidden="true"
          className={cn("size-full object-contain transition-opacity duration-200", !loaded && "opacity-0")}
          onLoadedData={() => setLoaded(true)} onError={failed}
        />
      ) : still ? (
        // eslint-disable-next-line @next/next/no-img-element -- pictures come from the resolver API, sized by the grid
        <img
          key={src} ref={img} src={src} alt="" loading="lazy" decoding="async" draggable={false}
          className={cn("size-full object-contain transition-opacity duration-200", (playing || !loaded) && "opacity-0")}
          onLoad={() => setLoaded(true)} onError={failed}
        />
      ) : (
        <span aria-hidden="true" className="flex size-full items-center justify-center" style={{ fontSize: size * 0.7 }}>{emoji.fallback || "□"}</span>
      )}
      {emoji.format === "animated" ? <span ref={stage} aria-hidden="true" className="pointer-events-none absolute inset-0 [&_svg]:!size-full" /> : null}
    </span>
  );
}
