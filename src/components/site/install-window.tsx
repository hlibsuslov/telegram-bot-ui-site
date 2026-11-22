"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { InstallGuide, InstallStep } from "@/content/site";
import { BrandIcon } from "./brand-icon";

// Tabs, keyboard navigation and the copy button are adapted from the 21st.dev
// "Split Developer Hero with Interactive Code Terminal" block.

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers or frames without clipboard access.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const handleCopy = async () => {
    if (!(await copyToClipboard(text))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `Copied: ${label}` : `Copy: ${label}`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="relative size-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-4 transition-all duration-200 motion-reduce:transition-none",
            copied ? "scale-50 opacity-0" : "scale-100 opacity-100",
          )}
        >
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-4 text-success transition-all duration-200 motion-reduce:transition-none",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span aria-hidden="true" className="w-11 text-left">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

export function CommandRow({ step }: { step: InstallStep }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{step.label}</p>
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 py-2 pr-2 pl-4">
        <pre className="min-w-0 flex-1 py-1 font-mono text-[13px] leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">
          <code>{step.command}</code>
        </pre>
        <CopyButton text={step.command} label={step.command} />
      </div>
    </div>
  );
}

export function InstallWindow({ guides }: { guides: InstallGuide[] }) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys, Home and End move between tools (roving tabindex).
  const handleKeyDown = (e: KeyboardEvent) => {
    const last = guides.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (active + 1) % guides.length
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (active - 1 + guides.length) % guides.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const current = guides[active] ?? guides[0];
  if (!current) return null;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_1fr] lg:gap-8">
      <div
        role="tablist"
        aria-label="Your agent"
        aria-orientation="vertical"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-0.5"
      >
        {guides.map((guide, i) => (
          <button
            key={guide.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${baseId}-panel`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:border-transparent",
              active === i
                ? "border-border bg-card font-medium text-foreground shadow-sm lg:border-border"
                : "border-border text-muted-foreground hover:text-foreground lg:hover:bg-muted/60",
            )}
          >
            <BrandIcon name={guide.icon} />
            {guide.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="min-w-0 self-start rounded-2xl border border-border bg-card p-4 shadow-[0_24px_60px_-32px_rgb(16_24_40/0.3)] sm:p-6"
      >
        <h3 className="flex items-center gap-2.5 font-semibold">
          <BrandIcon name={current.icon} className="size-5" />
          {current.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.note}</p>
        <div className="mt-5 space-y-4">
          {current.steps.map((step) => (
            <CommandRow key={step.command} step={step} />
          ))}
          <CommandRow step={current.update} />
        </div>
        {current.alt ? (
          <div className="mt-6 border-t border-border pt-5">
            <CommandRow step={current.alt} />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{current.alt.note}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
