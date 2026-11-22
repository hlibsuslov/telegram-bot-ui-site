import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { CommandRow } from "@/components/site/install-window";
import { Container, Section } from "@/components/site/section";
import { LOYALTY_STATES, ORDER_STATES } from "@/components/site/studio";
import { AgentFlow } from "@/components/studio/agent-flow";
import { DemoFrame } from "@/components/studio/demo-frame";
import { LiveWidget } from "@/components/studio/live-widget";
import { CONTRACT_URL, DEMO_BOT, RUN_NOTE, RUN_STEPS, STUDIO_FACTS, STUDIO_README_URL } from "@/content/studio";

const TITLE = "bot-ui Studio live demo: a sample Telegram bot you can use and edit";
const DESCRIPTION =
  "Use bot-ui Studio in your browser on Brewline, a sample coffee bot: the map of every screen, a Telegram-style simulator, the screen editor, live widgets and the task it writes for your coding agent.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/studio" },
  openGraph: { type: "website", url: "/studio", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const LINK = "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground";

export default function StudioPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <section aria-labelledby="demo-heading" className="pt-12 pb-16 sm:pt-16">
          <Container className="max-w-7xl">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                Live demo · bot-ui Studio
              </p>
              <h1 id="demo-heading" className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Use the Studio on a sample bot.
              </h1>
              <p className="mt-5 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
                {DEMO_BOT.name} is {DEMO_BOT.what}: {DEMO_BOT.screens} screens in {DEMO_BOT.locales.join(", ")}, a rule with two branches,
                an empty state, a declined payment and {DEMO_BOT.widgets} widgets. Everything below runs in your browser. Nothing is sent to
                Telegram, and your edits stay on this device.
              </p>
            </div>
            <div className="mt-10">
              <DemoFrame />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              The demo is the Studio’s offline edition with the bot’s snapshot inside: map, screens, simulator and changes. Widgets are below,
              and saving to files happens in the local Studio on your machine.
            </p>
          </Container>
        </section>

        <Section
          id="widgets"
          eyebrow="The bot’s widgets"
          title="Live widgets, built from the bot’s own files."
          description="These are the real builds of Brewline’s two widgets, running in the skill’s mock of Telegram’s widget runtime. Switch the state the bot sends, the language, or the site’s theme, and tap their buttons."
          className="border-t border-border"
        >
          <div className="grid gap-12 lg:grid-cols-2">
            <LiveWidget widget="order-status" states={ORDER_STATES} />
            <LiveWidget widget="loyalty-card" states={LOYALTY_STATES} />
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-5 text-muted-foreground">
            A browser preview: it shows the design and the flow, not how each Telegram app draws a widget. Telegram counts the size of the HTML
            after compression and allows 4 KB.
          </p>
        </Section>

        <Section
          id="agents"
          eyebrow="Connected to your AI agents"
          title="You point, the agent writes the code."
          description="The Studio and your coding agent work on the same files in the bot’s repository and follow the same contract, so every change is one reviewable diff."
          className="border-t border-border"
        >
          <AgentFlow />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STUDIO_FACTS.map((fact) => (
              <li key={fact.title} className="border-l-2 border-brand/40 pl-4">
                <p className="text-sm font-semibold">{fact.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{fact.text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="run"
          eyebrow="On your own bot"
          title="Run the Studio next to your bot."
          description={RUN_NOTE}
          className="border-t border-border"
        >
          <div className="max-w-3xl space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[0_24px_60px_-32px_rgb(16_24_40/0.3)] sm:p-6">
            {RUN_STEPS.map((step) => (
              <CommandRow key={step.command} step={step} />
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-muted-foreground">
            The format of the files and every rule the Studio checks are in the{" "}
            <a className={LINK} href={CONTRACT_URL}>
              project contract
            </a>
            ; commands, the offline edition and the adapters for aiogram and plain Bot API are in the{" "}
            <a className={LINK} href={STUDIO_README_URL}>
              Studio README
            </a>
            . The Telegram skill itself is installed separately: see <Link className={LINK} href="/#install">Install</Link>.
          </p>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
