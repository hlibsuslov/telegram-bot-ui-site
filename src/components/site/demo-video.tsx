"use client";

import { useEffect, useRef } from "react";
import { DEMO_VIDEO } from "@/content/site";
import { Container } from "./section";

/**
 * Muted, looping demo that plays only while at least half of it is on screen.
 * With reduced motion it never autoplays: the poster stays until the viewer
 * presses play. A pause by the viewer is respected until they press play again.
 */
export function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pausedByViewer = false;
    let pausingForScroll = false;
    const onPause = () => {
      if (!pausingForScroll) pausedByViewer = true;
      pausingForScroll = false;
    };
    const onPlay = () => {
      pausedByViewer = false;
    };
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= 0.5) {
          if (!pausedByViewer && video.paused) {
            // Autoplay can still be refused (data saver, browser policy); the controls remain.
            video.play().catch(() => {});
          }
        } else if (!video.paused) {
          pausingForScroll = true;
          video.pause();
        }
      },
      { threshold: [0, 0.5] },
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
    };
  }, []);

  return (
    <Container className="pb-4">
      <figure>
        <video
          ref={ref}
          controls
          muted
          loop
          playsInline
          preload="none"
          poster={DEMO_VIDEO.poster}
          width={DEMO_VIDEO.width}
          height={DEMO_VIDEO.height}
          aria-label="Demo video of the telegram-bot-ui skill"
          className="block aspect-video h-auto w-full rounded-2xl border border-border bg-muted"
        >
          {DEMO_VIDEO.sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
          <a href={DEMO_VIDEO.sources[DEMO_VIDEO.sources.length - 1].src}>Download the demo video</a>
        </video>
        <figcaption className="pt-3 text-sm text-muted-foreground">{DEMO_VIDEO.title}</figcaption>
      </figure>
    </Container>
  );
}
