"use client";

// Segmented filter chips with live counts. Adapted from "Filter Grid" by ddoemonn (21st.dev):
// a radiogroup with roving focus (arrows, Home, End) and a thumb that slides to the chosen chip.
import { useId, useRef, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type Chip = { id: string; label: string; count: number };

export function FilterChips({ chips, value, onChange, label }: { chips: Chip[]; value: string; onChange: (id: string) => void; label: string }) {
  const uid = useId();
  const reduced = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, chips.findIndex((c) => c.id === value));

  const go = (i: number) => {
    const n = (i + chips.length) % chips.length;
    refs.current[n]?.focus();
    onChange(chips[n].id);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: chips.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {chips.map((c, i) => {
        const on = i === index;
        return (
          <button
            key={c.id}
            ref={(node) => { refs.current[i] = node; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(c.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on ? "text-background" : "text-foreground ring-1 ring-border hover:bg-muted",
            )}
          >
            {on ? (
              <motion.span
                aria-hidden="true"
                layoutId={reduced ? undefined : `${uid}-thumb`}
                transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.45 }}
                className="absolute inset-0 rounded-md bg-foreground"
              />
            ) : null}
            <span className="relative">{c.label}</span>
            <span className={cn("relative text-xs tabular-nums", on ? "opacity-70" : "text-muted-foreground")}>{c.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-5 text-muted-foreground", className)}>
      Emoji packs belong to their authors and are served by Telegram. This library only links to them: we do not host,
      review or endorse them, their content can change at any time without notice, and we take no responsibility for it.
      To report a pack, use Telegram&apos;s own reporting.
    </p>
  );
}
