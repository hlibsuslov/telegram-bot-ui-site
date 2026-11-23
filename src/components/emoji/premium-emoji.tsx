"use client";

// One premium emoji as Telegram draws it: a still picture that comes alive on hover or focus
// (or always, when `play` is "always" and it is on screen). Animated (TGS) emoji are Lottie,
// fetched and decompressed only when they first play; video emoji are WEBM; static ones a picture.
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type EmojiData = {
  id: string; fallback: string; format: "static" | "animated" | "video";
  preview: string | null; animation: string | null;
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
  emoji, play = "hover", active: forced, className, size = 40,
}: {
  emoji: EmojiData;
  /** hover: plays while hovered or focused (inside an element with `group/emoji`, or the emoji itself); always: plays while visible */
  play?: "hover" | "always";
  /** a parent that tracks hover itself (a whole tile) passes it here */
  active?: boolean;
  className?: string;
  size?: number;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const stage = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState(false);
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

  const style = { width: size, height: size };
  const still = emoji.preview && !broken;
  return (
    <span
      ref={box}
      className={cn("relative inline-block shrink-0", className)}
      style={style}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {emoji.format === "video" && still ? (
        <video
          ref={video} src={emoji.preview ?? undefined} muted loop playsInline preload="metadata"
          aria-hidden="true" className="size-full object-contain" onError={() => setBroken(true)}
        />
      ) : still ? (
        // eslint-disable-next-line @next/next/no-img-element -- pictures come from the resolver API, sized by the grid
        <img
          src={emoji.preview ?? undefined} alt="" loading="lazy" decoding="async" draggable={false}
          className={cn("size-full object-contain transition-opacity", playing && "opacity-0")} onError={() => setBroken(true)}
        />
      ) : (
        <span aria-hidden="true" className="flex size-full items-center justify-center" style={{ fontSize: size * 0.7 }}>{emoji.fallback || "□"}</span>
      )}
      {emoji.format === "animated" ? <span ref={stage} aria-hidden="true" className="pointer-events-none absolute inset-0 [&_svg]:!size-full" /> : null}
    </span>
  );
}
