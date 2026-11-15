import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import {
  AfterSettings,
  AgentApproval,
  BeforeSettings,
  ChannelPost,
  RichAndWidget,
  StreamingReply,
} from "@/components/chat/demos";
import { COMPARISON } from "@/content/site";
import { Section } from "./section";

function DemoCard({
  index,
  title,
  children,
  visual,
  className,
}: {
  index: string;
  title: string;
  children: ReactNode;
  visual: ReactNode;
  className?: string;
}) {
  return (
    <article className={`flex min-w-0 flex-col rounded-3xl border border-border bg-card p-3 sm:p-4 ${className ?? ""}`}>
      <div className="px-2 pt-2 pb-5 sm:px-3">
        <p className="font-mono text-xs text-muted-foreground">{index}</p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-pretty text-muted-foreground">{children}</p>
      </div>
      <div className="flex flex-1 items-center">{visual}</div>
    </article>
  );
}

function Caption({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? Check : X;
  return (
    <li className="flex gap-2.5 text-sm leading-6 text-muted-foreground">
      <Icon aria-hidden="true" className={`mt-1 size-4 shrink-0 ${ok ? "text-success" : "text-danger"}`} />
      <span>{children}</span>
    </li>
  );
}

export function Demos() {
  return (
    <Section
      id="demos"
      eyebrow="What changes in your bot"
      title="The same bot, designed on purpose."
      description="Drawn mock-ups of what the skill teaches your agent to build. A bot message has no CSS: its interface is text, formatting, keyboards and the moments between states."
    >
      <article className="rounded-3xl border border-border bg-card p-3 sm:p-6" aria-labelledby="demo-settings">
        <div className="px-2 pt-2 pb-6 sm:px-0 sm:pt-0">
          <p className="font-mono text-xs text-muted-foreground">01</p>
          <h3 id="demo-settings" className="mt-2 text-lg font-semibold tracking-tight">
            Settings menu, before and after
          </h3>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-3 px-2 text-sm font-semibold text-danger sm:px-0">Without the skill</p>
            <BeforeSettings />
            <ul className="mt-4 space-y-1.5 px-2 sm:px-0">
              <Caption ok={false}>Shouting title, labels cut off, a destructive action one tap away</Caption>
              <Caption ok={false}>Double tap → two orders, and a stale “Pay now” that still works</Caption>
            </ul>
          </div>
          <div className="min-w-0">
            <p className="mb-3 px-2 text-sm font-semibold text-success sm:px-0">With the skill</p>
            <AfterSettings />
            <ul className="mt-4 space-y-1.5 px-2 sm:px-0">
              <Caption ok>One clear title, readable labels, danger styled and behind a confirmation</Caption>
              <Caption ok>One order per tap; the card updates in place once it’s paid</Caption>
            </ul>
          </div>
        </div>
      </article>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <DemoCard index="02" title="Streaming AI reply with Stop" visual={<StreamingReply />}>
          Real stages instead of “typing…”, one draft that fills in place, and a Stop button with a clear
          “stopped, incomplete” ending.
        </DemoCard>
        <DemoCard index="03" title="Agent notification and approval" visual={<AgentApproval />}>
          Your agent reports through its own bot. Approval buttons are bound to one action, and only the
          operators on the allowlist can press them.
        </DemoCard>
        <DemoCard index="04" title="Channel post: preview, approve, publish once" visual={<ChannelPost />}>
          Compose, validate and preview first. Nothing is published without a human’s yes, and a timed-out
          post is checked before any retry.
        </DemoCard>
        <DemoCard index="05" title="Rich message and an HTML widget" visual={<RichAndWidget />}>
          Compact tables and expandable quotes for reports; one live widget card instead of four status
          messages.
        </DemoCard>
      </div>

      <div className="mt-16">
        <h3 className="text-xl font-semibold tracking-tight">Without the skill, and with it</h3>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">What changes when your agent uses the skill</caption>
            <thead className="hidden bg-muted text-muted-foreground md:table-header-group">
              <tr>
                <th scope="col" className="w-1/4 px-5 py-3 font-medium">
                  Situation
                </th>
                <th scope="col" className="w-1/3 px-5 py-3 font-medium">
                  Without the skill
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  With the skill
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.situation} className="block border-t border-border first:border-t-0 md:table-row">
                  <th scope="row" className="block px-5 pt-4 font-semibold md:table-cell md:py-4 md:align-top">
                    {row.situation}
                  </th>
                  <td className="block px-5 pt-2 text-muted-foreground md:table-cell md:py-4 md:align-top">
                    <span className="flex gap-2">
                      <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
                      <span>
                        <span className="sr-only">Without: </span>
                        {row.without}
                      </span>
                    </span>
                  </td>
                  <td className="block px-5 pt-2 pb-4 md:table-cell md:py-4 md:align-top">
                    <span className="flex gap-2">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>
                        <span className="sr-only">With: </span>
                        {row.with}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}
