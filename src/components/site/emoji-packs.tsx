"use client";

// Layout reference: "Feature List Showcase" by felipemenezes098, found through 21st.dev (a step
// list that switches a matching visual). The emoji are real: static SVG frames of library packs.
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, House, Link2, SlidersHorizontal, Star } from "lucide-react";
import { EMOJI, SHOWCASE_PACKS, type PreviewEmoji } from "@/content/emoji-showcase";
import { cn } from "@/lib/utils";
import { EmojiGlyph } from "./emoji-glyph";
import { Container } from "./section";

function PacksVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">https://t.me/addemoji/…</span>
        <span className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-background">Import</span>
      </div>
      {SHOWCASE_PACKS.slice(0, 3).map((p) => (
        <div key={p.name} className="rounded-lg border border-border bg-background p-3">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium">{p.title}</span>
            <span className="text-xs text-muted-foreground">t.me/addemoji/{p.name} · {p.count} emoji</span>
          </p>
          <div className="mt-2 flex gap-1.5">
            {p.sample.map((e) => <EmojiGlyph key={e.id} emoji={e} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TagsVisual() {
  const facets: [string, string[], number][] = [
    ["Style", ["outline", "glyph", "native UI", "cartoon"], 2],
    ["Theme fit", ["adaptive", "both themes", "light"], 0],
    ["Motion", ["animated", "static"], 0],
  ];
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-border bg-background p-3">
        {facets.map(([name, values, on]) => (
          <div key={name} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="w-20 shrink-0 font-medium text-muted-foreground">{name}</span>
            {values.map((v, i) => (
              <span key={v} className={cn("rounded-md border px-2 py-0.5", i === on ? "border-brand bg-brand/10 text-foreground" : "border-border text-muted-foreground")}>{v}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-brand/40 bg-background p-3">
        <div className="grid shrink-0 grid-cols-3 gap-1">
          {SHOWCASE_PACKS[0].sample.map((e) => <EmojiGlyph key={e.id} emoji={e} className="size-6" />)}
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium">Telegram iOS Icons <span className="text-xs font-normal text-brand">covers 6 of 6 slots</span></p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">native UI, outline; takes the text colour in both themes</p>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal aria-hidden="true" className="size-3.5" /> Ranked for the slots your screens use.</p>
    </div>
  );
}

function MeaningsVisual() {
  const slots: [string, PreviewEmoji][] = [
    ["settings", EMOJI.settings], ["gift", EMOJI.gift], ["favorite", EMOJI.favorite],
    ["share", EMOJI.share], ["screen", EMOJI.screen], ["filters", EMOJI.filters],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map(([slot, emoji]) => (
          <div key={slot} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
            <EmojiGlyph emoji={emoji} className="size-6" />
            <span className="truncate text-sm font-medium">{slot}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm">
        <span aria-hidden="true">🎁</span>
        <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
        <EmojiGlyph emoji={EMOJI.gift} className="size-6" />
        <span className="flex-1 text-muted-foreground">Suggested for your screens</span>
        <span className="text-xs font-medium text-brand">Add</span>
      </div>
    </div>
  );
}

function AnywhereVisual() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 rounded-lg bg-muted p-0.5 text-center text-xs">
        {["At the start", "At the cursor", "At the end"].map((label, i) => (
          <span key={label} className={cn("rounded-md px-2 py-1 text-muted-foreground", i === 0 && "bg-background text-foreground shadow-sm")}>{label}</span>
        ))}
      </div>
      <div className="rounded-xl bg-[#d9e6c8] p-3 dark:bg-[#1f2b1f]">
        <div className="max-w-[18rem] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm text-[#101828] shadow-sm">
          <p className="flex items-center gap-1.5 font-semibold"><EmojiGlyph emoji={EMOJI.goldStars} className="size-5" /> Your order is ready</p>
          <p className="mt-1">Flat white, oat milk · pick it up at the bar <EmojiGlyph emoji={EMOJI.done} className="size-4 align-[-0.2em]" /></p>
        </div>
        <div className="mt-1.5 grid max-w-[18rem] grid-cols-2 gap-1">
          <span className="flex items-center justify-center gap-1.5 rounded-lg bg-[#5a9e4a]/90 px-2 py-1.5 text-xs font-medium text-white"><House className="size-3.5" aria-hidden="true" /> Menu</span>
          <span className="flex items-center justify-center gap-1.5 rounded-lg bg-[#5a9e4a]/90 px-2 py-1.5 text-xs font-medium text-white"><Star className="size-3.5" aria-hidden="true" /> Rate it</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Message text, captions, state texts, and the icon before a button label.</p>
    </div>
  );
}

function AgentVisual() {
  const rows: [string, PreviewEmoji][] = [["settings", EMOJI.settings], ["gift", EMOJI.gift], ["favorite", EMOJI.favorite]];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background font-mono text-xs">
      <p className="border-b border-border px-3 py-2 text-muted-foreground">$ bot-ui emoji brief</p>
      <div className="space-y-1 px-3 py-2.5">
        <p className="text-muted-foreground">## Icon map: place these, by meaning</p>
        {rows.map(([slot, e]) => (
          <p key={slot} className="flex items-center gap-3"><span className="w-16 text-brand">{slot}</span><span className="min-w-0 truncate">{e.id}</span><span>{e.fallback}</span></p>
        ))}
        <p className="pt-1 text-muted-foreground">## Rules</p>
        <p>- Use only ids from the icon map; never invent one.</p>
        <p>- Text: {"<tg-emoji emoji-id=\"ID\">FALLBACK</tg-emoji>"}</p>
        <p>- Button: {"\"icon\": {\"customEmojiId\": \"ID\"}"}</p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Add as many packs as you like",
    text: "Paste a t.me/addemoji link and the whole pack appears with its pictures. No bot token: only the pack name leaves your computer.",
    Visual: PacksVisual,
  },
  {
    title: "Or let tags pick the pack",
    text: "The Emoji page filters the whole library by style, colour, theme fit and motion and ranks packs for the slots your screens already use. The single-file snapshot works offline.",
    Visual: TagsVisual,
  },
  {
    title: "Give each emoji a meaning",
    text: "settings, gift, favorite: one meaning keeps one icon on every screen. Studio suggests premium emoji for the ordinary ones your screens already use.",
    Visual: MeaningsVisual,
  },
  {
    title: "Put them where they fit",
    text: "Insert at the start, at the cursor or at the end of any message, caption or state text, or set one as a button icon. Previews and the simulator draw the real emoji.",
    Visual: AnywhereVisual,
  },
  {
    title: "Your agent gets the same map",
    text: "The agent prompt carries the icon map, and bot-ui emoji brief lists ids, placements and rules. validate flags unknown ids and double icons.",
    Visual: AgentVisual,
  },
] as const;

export function EmojiPacks() {
  const [active, setActive] = useState(0);
  const base = useId();
  const { Visual } = STEPS[active];
  return (
    <section id="emoji" aria-labelledby="emoji-heading" className="py-16 sm:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium text-brand">Premium emoji in bot-ui Studio</p>
          <h2 id="emoji-heading" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Bring your own premium emoji packs.</h2>
          <p className="mt-4 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
            Import your custom emoji packs by link, use them in any screen of your bot, and hand the same icon map to your coding agent.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-[2fr_3fr]">
          <ol className="flex flex-col bg-card" role="tablist" aria-label="How premium emoji work in Studio" aria-orientation="vertical">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  role="tab"
                  id={`${base}-tab-${i}`}
                  aria-selected={active === i}
                  aria-controls={`${base}-panel`}
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex w-full gap-4 px-5 py-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-6",
                    active === i ? "bg-background" : "hover:bg-background/60",
                  )}
                >
                  <span className={cn("mt-0.5 font-mono text-sm tabular-nums", active === i ? "text-brand" : "text-muted-foreground")}>0{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{step.title}</span>
                    <span className={cn("mt-1 block text-sm leading-6 text-muted-foreground", active !== i && "max-lg:hidden lg:line-clamp-1")}>{step.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${active}`} className="flex min-h-80 items-center bg-card p-5 sm:p-8">
            <div key={active} className="w-full animate-in fade-in duration-300 motion-reduce:animate-none">
              <Visual />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link href="/studio#run" className="inline-flex items-center gap-2 rounded-md font-medium text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            Run Studio on your bot <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link href="/emoji" className="inline-flex items-center gap-2 rounded-md font-medium text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            Browse the emoji library <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
