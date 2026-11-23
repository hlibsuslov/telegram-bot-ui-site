import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import avatar from "../../../demo/bot-ui/assets/avatar.png";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Container, Section } from "@/components/site/section";
import { AgentFlow } from "@/components/studio/agent-flow";
import { DemoFrame } from "@/components/studio/demo-frame";
import { LiveWidget } from "@/components/studio/live-widget";
import { StudioMapPreview } from "@/components/studio/map-preview";
import { StudioActions } from "@/components/studio/studio-actions";
import { StudioSetup } from "@/components/studio/studio-setup";
import { DEMO_BOT_NAME, DEMO_SCREEN_COUNT, LIVE_WIDGETS } from "@/content/studio";
import { EMOJI_GUIDE_PATH } from "@/lib/emoji-links";

const TITLE = "bot-ui Studio | Telegram bot editor and simulator";
const DESCRIPTION =
  `See the map of a Telegram bot, test its buttons in the simulator and edit screens in the ${DEMO_BOT_NAME} demo. Run bot-ui Studio locally to work on your own bot.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/studio" },
  openGraph: { type: "website", url: "/studio", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

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
        <section aria-labelledby="studio-heading" className="pt-4 pb-12 sm:pt-6 sm:pb-16">
          <Container>
            <StudioMapPreview href="#demo" eager />
            <div className="mt-6 grid gap-5 sm:mt-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-8">
              <div className="max-w-2xl">
                <h1 id="studio-heading" className="text-3xl font-bold tracking-tight sm:text-5xl">bot-ui Studio</h1>
                <p className="mt-3 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
                  Map your Telegram bot, test its buttons and edit its messages. Try {DEMO_BOT_NAME}’s {DEMO_SCREEN_COUNT} screens in your browser.
                  For your own bot, run Studio locally on your computer.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  <Link href="/emoji" className="underline underline-offset-2">Browse Telegram emoji packs</Link>{" · "}
                  <Link href={EMOJI_GUIDE_PATH} className="underline underline-offset-2">Use custom emoji in your bot</Link>
                </p>
              </div>
              <StudioActions demoHref="#demo" runHref="#run" widgetsHref="#widgets" />
            </div>
          </Container>
        </section>

        <Section
          id="widgets"
          title={`${DEMO_BOT_NAME}’s live widgets`}
          description="Each card runs the bot’s real widget HTML. Tap its buttons: a simulated bot answers after a moment, and the widget updates as it would in Telegram."
          className="border-t border-border bg-card/40"
        >
          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            {LIVE_WIDGETS.map((card) => (
              <LiveWidget
                key={card.id}
                widget={card.id}
                hint={card.hint}
                states={card.states}
                initialState={"initialState" in card ? card.initialState : undefined}
              />
            ))}
          </div>
        </Section>

        <section id="demo" aria-labelledby="demo-heading" className="border-t border-border bg-card/40 py-10 sm:py-14">
          <Container>
            <div className="flex items-center gap-3">
              <Image src={avatar} alt="" width={40} height={40} className="rounded-full" />
              <h2 id="demo-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">{DEMO_BOT_NAME} live demo</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Use the editor and simulator with a coffee pickup bot. Drafts stay in your browser.
            </p>
            <div className="mt-5">
              <DemoFrame />
            </div>
          </Container>
        </section>

        <Section
          id="run"
          title="Run Studio locally"
          description="Work on your own bot at 127.0.0.1. Studio serves one project from your computer, and Save writes changes to that project’s bot-ui/ folder."
          className="border-t border-border"
        >
          <StudioSetup />
        </Section>

        <Section
          id="agents"
          title="From bot files to the Studio map"
          description="The local Studio and your coding agent share the bot-ui/ folder in your repository."
          className="border-t border-border"
        >
          <AgentFlow />
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
