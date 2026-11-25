"use client";

import { useState } from "react";
import { AGENT_PROMPTS } from "@/content/site";
import { cn } from "@/lib/utils";
import { CopyButton } from "./install-window";

export function AgentPrompt() {
  const [active, setActive] = useState(0);
  const prompt = AGENT_PROMPTS[active] ?? AGENT_PROMPTS[0];

  return (
    <div className="max-w-3xl rounded-2xl border border-border bg-card p-4 shadow-[0_24px_60px_-32px_rgb(16_24_40/0.3)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div role="group" aria-label="Language of the prompt" className="inline-flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {AGENT_PROMPTS.map((item, i) => (
            <button
              key={item.code}
              type="button"
              aria-pressed={active === i}
              onClick={() => setActive(i)}
              className={cn(
                "h-8 min-w-11 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <CopyButton text={prompt.text} label={`the prompt (${prompt.label})`} />
      </div>
      <p lang={prompt.code} className="mt-4 text-base leading-7 text-pretty">
        {prompt.text}
      </p>
    </div>
  );
}
