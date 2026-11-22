"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCENARIO_COUNT, STAGES, type Scenario } from "@/content/scenarios";
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
  const Icon = scenario.icon;
  return (
    <li className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
      <div className="flex gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-brand">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold tracking-tight text-pretty">{scenario.title}</h4>
          <p className="mt-1 text-sm leading-6 text-pretty text-muted-foreground">{scenario.when}</p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col items-end gap-1 rounded-2xl rounded-br-md bg-[var(--chat-bubble-out)] py-3 pr-3 pl-4 sm:flex-row sm:items-start sm:gap-3 sm:pl-5">
          <p className="w-full min-w-0 flex-1 py-0.5 text-[15px] leading-7 text-pretty text-[var(--chat-text)]">{scenario.prompt}</p>
          <CopyButton text={scenario.prompt} label={`prompt “${scenario.title}”`} />
        </div>

        <details className="group mt-2">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            What the agent does
            <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="mt-3 grid gap-5 pb-1 sm:grid-cols-[3fr_2fr] sm:gap-8">
            <ol className="space-y-2">
              {scenario.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-6">
                  <span aria-hidden="true" className="w-4 shrink-0 font-mono text-xs leading-6 text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-pretty">{step}</span>
                </li>
              ))}
            </ol>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Parts of the skill it uses</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {scenario.uses.map((use) => (
                  <li key={use} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[12px] leading-5 [overflow-wrap:anywhere]">
                    {use}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {scenario.pair ? (
            <p className="mt-4 flex gap-2.5 text-sm leading-6 text-muted-foreground">
              <Plug aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand" />
              <span>
                <span className="font-medium text-foreground">Pairs well with: </span>
                {scenario.pair}
              </span>
            </p>
          ) : null}
        </details>
      </div>
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
  const StageIcon = stage.icon;
  const panelId = `${baseId}-panel`;

  return (
    <Section
      id="prompts"
      eyebrow="Prompt scenarios"
      title="What to tell your agent, from the first Studio run to a one-button fix."
      description={`${SCENARIO_COUNT} prompts for every part of the skill. Pick a stage, copy a prompt, swap in your bot’s nouns and paste it into your agent.`}
    >
      <div
        role="tablist"
        aria-label="Stage of your bot"
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
      >
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const selected = active === i;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "group flex items-center gap-2.5 rounded-2xl border p-3 text-left sm:gap-3 transition-colors last:col-span-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-4 sm:last:col-span-1",
                selected
                  ? "border-brand/60 bg-card shadow-[0_12px_32px_-20px_rgb(37_99_235/0.55)]"
                  : "border-border bg-card/50 hover:border-input hover:bg-card",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl transition-colors sm:size-10",
                  selected ? "bg-brand text-white" : "bg-muted text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-medium whitespace-nowrap sm:text-base", selected ? "text-foreground" : "text-foreground/85")}>{s.label}</span>
                <span className="block text-xs text-muted-foreground">{s.scenarios.length} prompts</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-32px_rgb(16_24_40/0.3)]"
      >
        <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3.5 sm:px-6">
          <StageIcon aria-hidden="true" className="size-4 shrink-0 text-brand" />
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">{stage.label}.</span> {stage.summary}
          </p>
        </div>
        <ul key={stage.id} className="animate-in divide-y divide-border fade-in-0 duration-300 motion-reduce:animate-none">
          {stage.scenarios.map((scenario) => (
            <ScenarioRow key={scenario.id} scenario={scenario} />
          ))}
        </ul>
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-6 text-muted-foreground">
        The skill activates on its own when you describe the task. To call it by name, start the prompt with{" "}
        <code className="font-mono text-foreground">/telegram-bot-ui</code> in Claude Code or{" "}
        <code className="font-mono text-foreground">$telegram-bot-ui</code> in Codex. Anything public, a channel post or a deploy,
        still waits for your yes.
      </p>
    </Section>
  );
}
