import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import {
  CardApprove,
  CardDanger,
  CardPublish,
  CardStream,
  CardTable,
  CardWidget,
} from "@/components/chat/hero-cards";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { AGENTS, BOT_API, VERSION } from "@/content/site";
import { cn } from "@/lib/utils";
import { BrandIcon } from "./brand-icon";
import { StarButton } from "./header";
import { HeroRotate } from "./hero-rotate";
import { Container } from "./section";

const PHRASES = ["feel like products", "stream with Stop", "ask before acting", "post just once", "update in place"];

// Layout adapted from the 21st.dev "Landing Hero" (danielpetho/fancy): a centred
// headline with a rotating phrase, surrounded by floating cards that drift with
// the pointer. The cards are our own chat fragments instead of photos.
const FLOATING: { card: ReactNode; depth: number; className: string; tilt: string; delay: string }[] = [
  { card: <CardApprove />, depth: 1, className: "top-[9%] left-[2%] xl:left-[4%]", tilt: "-rotate-[5deg]", delay: "delay-150" },
  { card: <CardStream />, depth: 2.5, className: "top-[40%] left-[1%] xl:left-[2%]", tilt: "rotate-[3deg]", delay: "delay-300" },
  { card: <CardTable />, depth: 1.5, className: "top-[71%] left-[4%] xl:left-[7%]", tilt: "-rotate-[2deg]", delay: "delay-500" },
  { card: <CardDanger />, depth: 2, className: "top-[7%] right-[2%] xl:right-[4%]", tilt: "rotate-[5deg]", delay: "delay-200" },
  { card: <CardWidget />, depth: 1, className: "top-[43%] right-[1%] xl:right-[2%]", tilt: "-rotate-[4deg]", delay: "delay-400" },
  { card: <CardPublish />, depth: 3, className: "top-[73%] right-[4%] xl:right-[7%]", tilt: "rotate-[3deg]", delay: "delay-700" },
];

const CARD = "w-44 drop-shadow-[0_18px_32px_rgb(16_24_40/0.16)] xl:w-56";
const ENTER = "animate-in fade-in zoom-in-95 fill-mode-both duration-700 motion-reduce:animate-none";

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden py-16 lg:min-h-[760px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-20%] left-1/2 -z-10 size-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_9%,transparent),transparent)]"
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
        <Floating sensitivity={-0.5} className="h-full">
          {FLOATING.map(({ card, depth, className, tilt, delay }, i) => (
            <FloatingElement key={i} depth={depth} className={className}>
              <div className={cn(CARD, tilt, ENTER, delay)}>{card}</div>
            </FloatingElement>
          ))}
        </Floating>
      </div>

      <Container className="flex flex-col items-center text-center lg:max-w-[620px] xl:max-w-[720px]">
        <a
          href="#studio"
          className="group inline-flex items-center gap-2 rounded-full border border-brand/30 bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur transition-colors hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Try bot-ui Studio
          <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </a>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Agent Skill · Telegram Bot API {BOT_API} · v{VERSION}
        </p>

        <h1 id="hero-heading" className="mt-6 text-4xl leading-[1.08] font-bold tracking-tight sm:text-6xl xl:text-7xl">
          <span className="sr-only">Telegram bots that feel like real products</span>
          <span aria-hidden="true" className="block">
            Telegram bots that
          </span>
          <span aria-hidden="true" className="block">
            <HeroRotate texts={PHRASES} />
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-pretty text-muted-foreground">
          Give your coding agent a skill for the whole interface of a Telegram bot: screens, texts, keyboards, streaming replies, widgets and channel posts.
          Use <a href="#studio" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">bot-ui Studio</a>{" "}
          to map your bot and test its flows.
        </p>

        <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <a
            href="#install"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-px"
          >
            Install
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </a>
          <StarButton size="lg" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">MIT licensed · offline checks · no bot token needed to try it</p>

        {/* Phones and tablets get two fixed cards instead of the floating set. */}
        <div aria-hidden="true" className="mt-10 grid w-full max-w-md grid-cols-2 gap-3 lg:hidden">
          <div className="-rotate-[2deg] drop-shadow-[0_14px_24px_rgb(16_24_40/0.14)]">
            <CardApprove />
          </div>
          <div className="rotate-[2deg] drop-shadow-[0_14px_24px_rgb(16_24_40/0.14)]">
            <CardDanger />
          </div>
        </div>

        <div className="mt-12">
          <p className="text-sm font-medium">Works with</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-3" aria-label="Supported agents">
            {AGENTS.map((agent) => (
              <li key={agent.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                <BrandIcon name={agent.icon} className="text-foreground" />
                {agent.name}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
