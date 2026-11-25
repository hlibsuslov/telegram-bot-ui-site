import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AgentFlow } from "@/components/studio/agent-flow";
import { LiveWidget } from "@/components/studio/live-widget";
import { StudioMapPreview } from "@/components/studio/map-preview";
import { StudioActions } from "@/components/studio/studio-actions";
import { DEMO_BOT_NAME, ORDER_STATES } from "@/content/studio";
import { Container } from "./section";

export function Studio() {
  return (
    <section id="studio" aria-labelledby="studio-heading" className="border-y border-border bg-card/40 py-12 sm:py-20">
      <Container>
        <StudioMapPreview href="/studio#demo" />
        <div className="mt-7 grid gap-5 sm:mt-9 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
          <div className="max-w-2xl">
            <h2 id="studio-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">bot-ui Studio</h2>
            <p className="mt-3 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
              See every screen of your Telegram bot and where its buttons lead. Test the flow in the simulator or edit a screen
              alongside your coding agent. Try {DEMO_BOT_NAME} on this site, then run Studio on your own computer to work with your bot.
            </p>
          </div>
          <StudioActions demoHref="/studio#demo" runHref="/studio#run" />
        </div>

        {/* Layout reference: Feature Bento by UI Layouts, found through 21st.dev. */}
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:mt-16 lg:grid-cols-[2fr_3fr]">
          <article className="flex min-w-0 flex-col gap-5 bg-card p-5 sm:p-7">
            <div>
              <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Telegram simulator</h3>
              <p className="mt-2 max-w-md leading-7 text-muted-foreground">
                Place an order as a customer and watch every update: a Rich receipt, the live order widget, the pickup guide. Retry a declined payment or see what a first-time visitor gets.
              </p>
            </div>
            <Image
              src="/studio/simulator.webp"
              alt={`${DEMO_BOT_NAME}’s order in the Studio’s Telegram simulator: a Rich receipt with a table, the live order-status widget and the pickup guide`}
              width={500}
              height={620}
              unoptimized
              className="mt-auto h-auto w-full rounded-lg border border-border bg-white"
            />
          </article>
          <article className="flex min-w-0 flex-col gap-5 bg-card p-5 sm:p-7">
            <div>
              <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Screen editor</h3>
              <p className="mt-2 max-w-lg leading-7 text-muted-foreground">
                Edit messages, Rich documents with tables and buttons, labels and transitions. See the change in the chat preview and follow its route on the map.
              </p>
            </div>
            <Image
              src="/studio/editor.webp"
              alt="The receipt screen’s Rich message, with a compact table and a copy button, alongside its live chat preview in Studio"
              width={760}
              height={620}
              unoptimized
              className="mt-auto h-auto w-full rounded-lg border border-border bg-white"
            />
          </article>
        </div>

        <div className="mt-12 grid items-center gap-8 border-t border-border pt-10 sm:mt-16 sm:pt-14 lg:grid-cols-[4fr_5fr] lg:gap-16">
          <div className="max-w-md">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">Live widgets</h3>
            <p className="mt-3 leading-7 text-muted-foreground">
              Tap Keep it warm. The order tracker runs the demo bot’s widget HTML and shows the reply right in the card. Five more widgets wait on the Studio page: a cart, pickup times, a rating, a happy hour code and a drink quiz.
            </p>
            <Link href="/studio#widgets" className="mt-5 inline-flex items-center gap-2 rounded-md font-medium text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              Try all six widgets <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <LiveWidget widget="order-status" states={ORDER_STATES} initialState="ready" showOptions={false} />
        </div>

        <div className="mt-12 border-t border-border pt-10 sm:mt-16 sm:pt-14">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">From bot files to the Studio map</h3>
            <p className="mt-3 leading-7 text-muted-foreground">
              The local Studio and your coding agent share the bot-ui/ folder in your repository.
            </p>
          </div>
          <div className="mt-6"><AgentFlow stepHeading="h4" /></div>
        </div>
      </Container>
    </section>
  );
}
