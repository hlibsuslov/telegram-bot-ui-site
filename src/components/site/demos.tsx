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

function DemoNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-brand/40 text-sm font-semibold text-brand tabular-nums"
    >
      {n}
    </span>
  );
}

function DemoHeading({ n, id, title }: { n: number; id: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <DemoNumber n={n} />
      <h3 id={id} className="text-lg font-semibold tracking-tight">
        <span className="sr-only">{`Demo ${n}: `}</span>
        {title}
      </h3>
    </div>
  );
}

function DemoCard({ n, title, children, visual }: { n: number; title: string; children: ReactNode; visual: ReactNode }) {
  const id = `demo-${n}`;
  return (
    <article aria-labelledby={id} className="flex min-w-0 flex-col border-t border-border pt-6">
      <DemoHeading n={n} id={id} title={title} />
      <p className="mt-2 pb-6 text-sm leading-6 text-pretty text-muted-foreground sm:pl-11">{children}</p>
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
      <article aria-labelledby="demo-1" className="border-t border-border pt-6">
        <div className="pb-8">
          <DemoHeading n={1} id="demo-1" title="Settings menu, before and after" />
        </div>
        <div className="grid gap-10 md:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-3 text-sm font-semibold text-danger">Without the skill</p>
            <BeforeSettings />
            <ul className="mt-4 space-y-1.5">
              <Caption ok={false}>Shouting title, labels cut off, a destructive action one tap away</Caption>
              <Caption ok={false}>Double tap → two orders, and a stale “Pay now” that still works</Caption>
            </ul>
          </div>
          <div className="min-w-0">
            <p className="mb-3 text-sm font-semibold text-success">With the skill</p>
            <AfterSettings />
            <ul className="mt-4 space-y-1.5">
              <Caption ok>One clear title, readable labels, danger styled and behind a confirmation</Caption>
              <Caption ok>One order per tap; the card updates in place once it’s paid</Caption>
            </ul>
          </div>
        </div>
      </article>

      <div className="mt-16 grid gap-x-10 gap-y-16 md:grid-cols-2">
        <DemoCard n={2} title="Streaming AI reply with Stop" visual={<StreamingReply />}>
          Real stages instead of “typing…”, one draft that fills in place, and a Stop button with a clear
          “stopped, incomplete” ending.
        </DemoCard>
        <DemoCard n={3} title="Agent notification and approval" visual={<AgentApproval />}>
          Your agent reports through its own bot. Approval buttons are bound to one action, and only the
          operators on the allowlist can press them.
        </DemoCard>
        <DemoCard n={4} title="Channel post: preview, approve, publish once" visual={<ChannelPost />}>
          Compose, validate and preview first. Nothing is published without a human’s yes, and a timed-out
          post is checked before any retry.
        </DemoCard>
        <DemoCard n={5} title="Rich message and an HTML widget" visual={<RichAndWidget />}>
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
