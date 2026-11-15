"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { InstallMethod } from "@/content/site";

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

function CopyButton({ text, label }: { text: string; label: string }) {
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

export function InstallWindow({ methods }: { methods: InstallMethod[] }) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys, Home and End move between tabs (roving tabindex).
  const handleKeyDown = (e: KeyboardEvent) => {
    const last = methods.length - 1;
    const next =
      e.key === "ArrowRight"
        ? (active + 1) % methods.length
        : e.key === "ArrowLeft"
          ? (active - 1 + methods.length) % methods.length
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

  const current = methods[active] ?? methods[0];
  if (!current) return null;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-32px_rgb(16_24_40/0.3)]">
      <div className="flex items-center gap-3 border-b border-border bg-muted/60 px-3 py-2.5 sm:px-4">
        <div className="hidden gap-1.5 sm:flex" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div
          role="tablist"
          aria-label="Install methods"
          onKeyDown={handleKeyDown}
          className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]"
        >
          {methods.map((method, i) => (
            <button
              key={method.id}
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
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:text-sm",
                active === i
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${active}`} className="p-4 sm:p-6">
        <h3 className="font-semibold">{current.title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{current.note}</p>
        <ol className="mt-5 space-y-3">
          {current.commands.map((command, i) => (
            <li key={command} className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 py-2 pr-2 pl-4">
              {current.commands.length > 1 ? (
                <span aria-hidden="true" className="pt-1.5 font-mono text-xs leading-6 text-muted-foreground">
                  {i + 1}
                </span>
              ) : null}
              <pre className="min-w-0 flex-1 py-1 font-mono text-[13px] leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">
                <code>{command}</code>
              </pre>
              <CopyButton text={command} label={command} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
