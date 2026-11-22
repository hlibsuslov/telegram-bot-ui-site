"use client";

import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { DEMO_PAGE, DEMO_TOUR } from "@/content/studio";
import { cn } from "@/lib/utils";

// The Studio client in demo mode, same origin, in a frame. The tour switches its hash route
// (#/map, #/simulator, ...) without reloading it, so drafts made in one step stay for the next.
export function DemoFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState(0);
  const [src] = useState(`${DEMO_PAGE}${DEMO_TOUR[0].hash}`);

  const open = (i: number) => {
    setActive(i);
    const hash = DEMO_TOUR[i].hash;
    try {
      const win = frame.current?.contentWindow;
      if (win) win.location.hash = hash;
    } catch {
      if (frame.current) frame.current.src = `${DEMO_PAGE}${hash}`;
    }
  };

  return (
    <div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Try this in the demo">
        {DEMO_TOUR.map((step, i) => (
          <li key={step.hash}>
            <button
              type="button"
              onClick={() => open(i)}
              aria-pressed={active === i}
              aria-controls="studio-demo-frame"
              className={cn(
                "flex h-full w-full flex-col rounded-xl border p-3.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active === i ? "border-brand/50 bg-card shadow-sm" : "border-border hover:bg-card/70",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    active === i ? "bg-brand text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                {step.title}
              </span>
              <span className="mt-1.5 text-xs leading-5 text-muted-foreground">{step.text}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_32px_80px_-40px_rgb(16_24_40/0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <div aria-hidden="true" className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <p className="truncate text-xs text-muted-foreground">bot-ui Studio · Brewline · runs in your browser</p>
          <a
            href={`${DEMO_PAGE}${DEMO_TOUR[active].hash}`}
            target="_blank"
            rel="noopener"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Maximize2 aria-hidden="true" className="size-3.5" />
            Full screen
          </a>
        </div>
        <iframe
          ref={frame}
          id="studio-demo-frame"
          title="bot-ui Studio demo with the Brewline bot"
          src={src}
          allow="clipboard-write"
          className="block h-[min(860px,calc(100svh-6rem))] min-h-[600px] w-full border-0 bg-background"
        />
      </div>
    </div>
  );
}
