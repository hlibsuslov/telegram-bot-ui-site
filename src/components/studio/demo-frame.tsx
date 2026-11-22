"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, GitPullRequest, Map, MessagesSquare, PanelsTopLeft, Puzzle } from "lucide-react";
import { DEMO_BOT_NAME, DEMO_PAGE, DEMO_TOUR } from "@/content/studio";
import { cn } from "@/lib/utils";

const MAP_HASH = "#/map";
const VIEW_ICONS = {
  "#/map": Map,
  "#/simulator": MessagesSquare,
  "#/screens/entry.start": PanelsTopLeft,
  "#/task": GitPullRequest,
};

export function DemoFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [hash, setHash] = useState(MAP_HASH);
  const [ready, setReady] = useState(false);
  const section = hash.split("/")[1];
  const active = DEMO_TOUR.find((step) => step.sections.some((route) => route === section));

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;

    let detach = () => {};
    const connect = () => {
      detach();
      const demo = iframe.contentWindow;
      if (!demo || demo.location.pathname !== DEMO_PAGE) return;

      const sync = () => setHash(demo.location.hash || MAP_HASH);
      sync();
      setReady(true);
      demo.addEventListener("hashchange", sync);
      detach = () => demo.removeEventListener("hashchange", sync);
    };

    iframe.addEventListener("load", connect);
    connect();
    return () => {
      iframe.removeEventListener("load", connect);
      detach();
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Demo views" className="flex flex-wrap gap-1.5">
          {DEMO_TOUR.map((step) => {
            const Icon = VIEW_ICONS[step.hash];
            return (
              <button
                key={step.hash}
                type="button"
                disabled={!ready}
                onClick={() => {
                  const demo = frame.current?.contentWindow;
                  if (demo) demo.location.hash = step.hash;
                }}
                aria-pressed={active === step}
                aria-controls="studio-demo-frame"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60",
                  active === step ? "border-brand/40 bg-card text-foreground" : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {step.title}
              </button>
            );
          })}
          <a href="#widgets" className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <Puzzle aria-hidden="true" className="size-4" />
            Widgets
          </a>
        </div>
        <a
          href={`${DEMO_PAGE}${hash}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Open in a new tab
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
      </div>
      <p aria-live="polite" className="mt-2 min-h-6 text-sm leading-6 text-muted-foreground">
        {ready ? active?.text : "Loading the Studio workspace…"}
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white shadow-sm sm:rounded-2xl">
        <iframe
          ref={frame}
          id="studio-demo-frame"
          title={`bot-ui Studio demo with the ${DEMO_BOT_NAME} bot`}
          src={`${DEMO_PAGE}${MAP_HASH}`}
          loading="lazy"
          allow="clipboard-write"
          className="block h-[calc(100svh-9rem)] min-h-[420px] w-full border-0 sm:h-[min(760px,calc(100svh-5rem))]"
        />
      </div>
    </div>
  );
}
