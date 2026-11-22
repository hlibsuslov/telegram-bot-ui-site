import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AgentFlow } from "@/components/studio/agent-flow";
import { LiveWidget } from "@/components/studio/live-widget";
import { MapMock } from "@/components/studio/map-mock";
import { ScreenEditMock } from "@/components/studio/screen-edit-mock";
import { DEMO_BOT, PILLARS, STUDIO_FACTS, type StudioPillar } from "@/content/studio";
import { cn } from "@/lib/utils";
import { Container } from "./section";

export const ORDER_STATES = [
  { id: "default", label: "Brewing" },
  { id: "late", label: "Running late" },
  { id: "ready", label: "Ready" },
  { id: "picked", label: "Picked up" },
];

export const LOYALTY_STATES = [
  { id: "default", label: "7 stamps" },
  { id: "almost", label: "9 stamps" },
  { id: "free", label: "Free drink" },
  { id: "new", label: "New guest" },
];

function PillarText({ pillar, size }: { pillar: StudioPillar; size: "lg" | "md" }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2.5 text-sm font-medium text-brand">
        <span
          aria-hidden="true"
          className="inline-flex size-7 items-center justify-center rounded-full border border-brand/40 text-xs font-semibold tabular-nums"
        >
          {pillar.n}
        </span>
        {pillar.label}
      </p>
      <h3
        id={`studio-${pillar.id}`}
        className={cn("mt-4 font-semibold tracking-tight text-balance", size === "lg" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl")}
      >
        {pillar.title}
      </h3>
      <p className="mt-3 text-base leading-7 text-pretty text-muted-foreground">{pillar.text}</p>
      <ul className="mt-5 space-y-2.5">
        {pillar.points.map((point) => (
          <li key={point} className="flex gap-2.5 text-sm leading-6">
            <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-success" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pillar({ pillar, visual, flip, size = "md" }: { pillar: StudioPillar; visual: ReactNode; flip?: boolean; size?: "lg" | "md" }) {
  return (
    <article
      aria-labelledby={`studio-${pillar.id}`}
      className={cn(
        "grid items-center gap-10 border-t border-border pt-10 lg:gap-14",
        size === "lg" ? "lg:grid-cols-[0.85fr_1.4fr]" : flip ? "lg:grid-cols-[1.1fr_1fr]" : "lg:grid-cols-[1fr_1.1fr]",
      )}
    >
      <div className={cn(flip && "lg:order-2")}>
        <PillarText pillar={pillar} size={size} />
      </div>
      <div className={cn("min-w-0", flip && "lg:order-1")}>{visual}</div>
    </article>
  );
}

const PRIMARY_CTA =
  "group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-px";
const SECONDARY_CTA =
  "inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function Studio() {
  const [map, widgets, screens] = PILLARS;
  return (
    <section id="studio" aria-labelledby="studio-heading" className="relative isolate overflow-hidden border-y border-border bg-card/40 py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[520px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_8%,transparent),transparent)]"
      />
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
            New · bot-ui Studio
          </p>
          <h2 id="studio-heading" className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            See your whole bot. Change it together with your agent.
          </h2>
          <p className="mt-5 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
            A workspace for the interface of a Telegram bot, kept as files in the bot’s own repository. A map of every screen with a
            simulator, a widget builder with a live preview, and a screen editor, all working on the same files as your coding agent.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/studio" className={PRIMARY_CTA}>
              Try the live demo
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <Link href="/studio#run" className={SECONDARY_CTA}>
              Run it on your bot
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The demo is {DEMO_BOT.name}, {DEMO_BOT.what}: {DEMO_BOT.screens} screens, {DEMO_BOT.widgets} widgets, three languages.
          </p>
        </div>

        <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
          <Pillar
            pillar={map}
            size="lg"
            visual={
              <div className="overflow-hidden rounded-2xl border border-border shadow-[0_24px_60px_-32px_rgb(16_24_40/0.35)]">
                <MapMock />
              </div>
            }
          />
          <Pillar pillar={widgets} flip visual={<LiveWidget widget="order-status" states={ORDER_STATES} />} />
          <Pillar pillar={screens} visual={<ScreenEditMock />} />
        </div>

        <div className="mt-20 border-t border-border pt-10 sm:mt-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-brand">Connected to your AI agents</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">You point, the agent writes the code.</h3>
            <p className="mt-3 text-base leading-7 text-pretty text-muted-foreground">
              The Studio and your agent change the same files through the same rules, so you can work in either and review one diff.
              Already have an aiogram bot? The Studio builds its map from the code without changing it.
            </p>
          </div>
          <div className="mt-8">
            <AgentFlow />
          </div>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STUDIO_FACTS.map((fact) => (
            <li key={fact.title} className="border-l-2 border-brand/40 pl-4">
              <p className="text-sm font-semibold">{fact.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{fact.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
