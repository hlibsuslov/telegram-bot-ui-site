"use client";

// Layout reference: "Feature List Showcase" by felipemenezes098, found through 21st.dev (a step
// list that switches a matching visual). The visuals are drawn here: stand-in glyphs, no pack art.
import Link from "next/link";
import { useId, useState, type ComponentType, type SVGProps } from "react";
import {
  ArrowLeft, ArrowRight, Bell, Check, Coffee, Gift, Heart, House, Link2, Package, ShoppingCart, Sparkles, Star, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "./section";

type Glyph = ComponentType<SVGProps<SVGSVGElement>>;

/** A premium emoji stand-in: a tinted tile with a glyph, the way a custom emoji pack looks in a grid. */
function Emoji({ icon: Icon, tone, className }: { icon: Glyph; tone: number; className?: string }) {
  const tones = [
    "bg-sky-500 text-white", "bg-amber-400 text-amber-950", "bg-emerald-500 text-white",
    "bg-rose-500 text-white", "bg-violet-500 text-white", "bg-orange-500 text-white",
  ];
  return (
    <span aria-hidden="true" className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-lg", tones[tone % tones.length], className)}>
      <Icon className="size-[60%]" strokeWidth={2.25} />
    </span>
  );
}

const PACK_A: Glyph[] = [House, ShoppingCart, Check, ArrowLeft, Bell, Package, Timer, Star, Gift, Heart, Coffee, Sparkles];

function PacksVisual() {
  const packs = [
    { name: "Shop icons", link: "t.me/addemoji/ShopIcons", count: 120, start: 0 },
    { name: "Status marks", link: "t.me/addemoji/StatusMarks", count: 48, start: 4 },
    { name: "Coffee set", link: "t.me/addemoji/CoffeeSet", count: 64, start: 8 },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">https://t.me/addemoji/…</span>
        <span className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-background">Import</span>
      </div>
      {packs.map((p, i) => (
        <div key={p.name} className="rounded-lg border border-border bg-background p-3">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium">{p.name}</span>
            <span className="text-xs text-muted-foreground">{p.link} · {p.count} emoji</span>
          </p>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: 7 }, (_, k) => <Emoji key={k} icon={PACK_A[(p.start + k) % PACK_A.length]} tone={i * 2 + k} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function MeaningsVisual() {
  const icons: [string, Glyph, number][] = [
    ["home", House, 0], ["cart", ShoppingCart, 5], ["done", Check, 2], ["back", ArrowLeft, 4], ["pending", Timer, 1], ["favorite", Star, 3],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {icons.map(([slot, icon, tone]) => (
          <div key={slot} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
            <Emoji icon={icon} tone={tone} />
            <span className="truncate text-sm font-medium">{slot}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm">
        <span aria-hidden="true">🛒</span>
        <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
        <Emoji icon={ShoppingCart} tone={5} />
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
          <p className="flex items-center gap-1.5 font-semibold"><Emoji icon={Coffee} tone={5} className="size-5" /> Your order is ready</p>
          <p className="mt-1">Flat white, oat milk · pick it up at the bar <Emoji icon={Check} tone={2} className="size-4 align-[-0.2em]" /></p>
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
  const rows = [["home", "5368324170671202286", "🏠"], ["cart", "5370869711888194012", "🛒"], ["done", "5325536405093384220", "✅"]];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background font-mono text-xs">
      <p className="border-b border-border px-3 py-2 text-muted-foreground">$ bot-ui emoji brief</p>
      <div className="space-y-1 px-3 py-2.5">
        <p className="text-muted-foreground">## Icon map: place these, by meaning</p>
        {rows.map(([slot, id, fb]) => (
          <p key={slot} className="flex gap-3"><span className="w-12 text-brand">{slot}</span><span className="min-w-0 truncate">{id}</span><span>{fb}</span></p>
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
    title: "Give each emoji a meaning",
    text: "home, cart, done: one meaning keeps one icon on every screen. Studio suggests premium emoji for the ordinary ones your screens already use.",
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
          <p className="mb-3 text-sm font-medium text-brand">New in bot-ui Studio</p>
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
          <p className="text-muted-foreground">Telegram shows custom emoji when the bot has a Fragment username or its owner has Premium.</p>
        </div>
      </Container>
    </section>
  );
}
