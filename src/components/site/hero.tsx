import { ArrowRight } from "lucide-react";
import { HeroChat } from "@/components/chat/demos";
import { AGENTS, BOT_API, VERSION } from "@/content/site";
import { BrandIcon } from "./brand-icon";
import { StarButton } from "./header";
import { Container } from "./section";

// Layout adapted from the 21st.dev "Split Developer Hero" block: copy on the
// left, a product visual on the right, stacked on phones.
export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="relative isolate overflow-hidden pt-12 pb-8 sm:pt-20 sm:pb-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] -z-10 size-[640px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_10%,transparent),transparent)]"
      />
      <Container className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
            Agent Skill · Telegram Bot API {BOT_API} · v{VERSION}
          </p>
          <h1 id="hero-heading" className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Telegram bots that feel like <span className="text-brand">real products</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-pretty text-muted-foreground">
            A UI/UX skill for your coding agent: clean screens and keyboards, streaming answers with Stop, live
            widgets and channel posts that go out once.{" "}
            <span className="text-foreground">Updated for every Bot API release.</span>
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#install"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-px"
            >
              Install
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </a>
            <StarButton size="lg" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">MIT licensed · offline checks · no bot token needed to try it</p>
          <div className="mt-10">
            <p className="text-sm font-medium">Works with</p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-3" aria-label="Supported agents">
              {AGENTS.map((agent) => (
                <li key={agent.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BrandIcon name={agent.icon} className="text-foreground" />
                  {agent.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="min-w-0 drop-shadow-[0_24px_40px_rgb(16_24_40/0.14)]">
          <HeroChat />
        </div>
      </Container>
    </section>
  );
}
