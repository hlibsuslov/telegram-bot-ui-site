"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { STAGES, type Scenario } from "@/content/scenarios";
import { CopyButton } from "./install-window";
import { Section } from "./section";

// Stage switcher adapted from the 21st.dev "Feature Tab Switcher" block (Hirael feature-11, MIT):
// arrow keys move between stages and the list below follows.

/** Arrow keys, Home and End for a roving-tabindex tablist. Returns the new index or -1. */
function nextIndex(e: KeyboardEvent, current: number, count: number) {
  switch (e.key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return -1;
  }
}

function ScenarioRow({ scenario }: { scenario: Scenario }) {
  const promptParts = scenario.prompt.split("`");

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4">
      <h3 className="font-semibold tracking-tight text-pretty">{scenario.title}</h3>
      <CopyButton text={promptParts.join("")} label={`prompt “${scenario.title}”`} />

      <p className="col-span-2 max-w-[75ch] text-[15px] leading-6 text-muted-foreground [overflow-wrap:anywhere]">
        {promptParts.map((part, index) =>
          index % 2 ? <code key={index} className="font-mono text-[0.9em] text-foreground">{part}</code> : part,
        )}
      </p>

      <details className="group col-span-2 max-w-[75ch]">
        <summary className="inline-flex min-h-7 cursor-pointer list-none items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          Workflow
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6">
          {scenario.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <p className="mt-2 text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
          <span className="font-medium text-foreground">References</span>{" · "}{scenario.uses.join(", ")}
        </p>
      </details>
    </li>
  );
}

export function Scenarios() {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    const next = nextIndex(e, active, STAGES.length);
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const stage = STAGES[active] ?? STAGES[0];
  const panelId = `${baseId}-panel`;

  return (
    <Section
      id="prompts"
      title="Prompts for your Telegram bot"
      description={
        <>
          Copy a prompt into your coding agent. To invoke the skill by name, use{" "}
          <code className="font-mono text-[0.8em] text-foreground">$telegram-bot-ui</code> in Codex or{" "}
          <code className="font-mono text-[0.8em] text-foreground">/telegram-bot-ui:telegram-bot-ui</code> with the Claude Code plugin.
        </>
      }
    >
      <div
        role="tablist"
        aria-label="Stage of your bot"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-x-1.5 border-b border-border text-[13px] min-[360px]:gap-x-3 min-[360px]:text-sm sm:gap-x-7"
      >
        {STAGES.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={panelId}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className="-mb-px min-h-10 cursor-pointer border-b-2 border-transparent font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-selected:border-brand aria-selected:text-foreground"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${baseId}-tab-${active}`}
      >
        <ul key={stage.id} className="divide-y divide-border">
          {stage.scenarios.map((scenario) => (
            <ScenarioRow key={scenario.id} scenario={scenario} />
          ))}
        </ul>
      </div>
    </Section>
  );
}
