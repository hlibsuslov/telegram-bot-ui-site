"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { MARQUEE } from "@/content/emoji-showcase";
import { cn } from "@/lib/utils";
import { EmojiGlyph } from "./emoji-glyph";

/** Two drifting rows of library emoji. One button pauses both; reduced motion keeps them still. */
export function EmojiMarquee() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="space-y-3 overflow-hidden rounded-2xl border border-border bg-card py-5 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        {MARQUEE.map((row, r) => (
          <div
            key={r}
            className={cn("flex w-max gap-3 motion-safe:animate-[emoji-marquee_48s_linear_infinite]", paused && "[animation-play-state:paused]")}
            style={r % 2 ? { animationDirection: "reverse" } : undefined}
          >
            {[...row, ...row].map((emoji, i) => (
              <span key={i} className="flex size-14 items-center justify-center rounded-xl bg-muted/60 sm:size-16">
                <EmojiGlyph emoji={emoji} className="size-9 sm:size-10" />
              </span>
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="absolute right-3 bottom-3 inline-flex size-8 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:hidden"
      >
        {paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
        <span className="sr-only">{paused ? "Play the emoji animation" : "Pause the emoji animation"}</span>
      </button>
    </div>
  );
}
