"use client";

// The /emoji index in Telegram's visual language: a settings-style list on the left (library,
// collections, categories with an icon taken from the packs), search and a format switch on top,
// collection rows on the first screen, then the pack grid. Packs play on hover.
import Link from "next/link";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { Bookmark, Check, ChevronRight, Copy, LayoutGrid, Loader2, Search, Sparkles, Star, X } from "lucide-react";
import type { Collection, LibraryPack } from "@/lib/emoji-library";
import { BOT_SLOTS } from "@/lib/emoji-slots";
import { PremiumEmoji } from "./premium-emoji";
import { copy, useSaved } from "./saved";
import { useEmojiSearch } from "./use-emoji-search";
import type { EmojiHit, SearchResult } from "@/lib/emoji-search";
import { cn } from "@/lib/utils";

export function matches(search: string, query: string): boolean {
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((t) => search.includes(t));
}

type View = { kind: "all" } | { kind: "saved" } | { kind: "collection"; id: string } | { kind: "category"; name: string };
type Format = "any" | "animated" | "static";
const FORMAT_LABEL = { static: "Static", animated: "Animated", video: "Video" } as const;
const PAGE = 36;

function formatOk(p: LibraryPack, f: Format) {
  if (f === "animated") return p.formats.some((x) => x !== "static");
  if (f === "static") return p.formats.length === 1 && p.formats[0] === "static";
  return true;
}

function Cell({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; count: number }) {
  return (
    <li>
      <button
        type="button" onClick={onClick} aria-current={active}
        className="tg-cell flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left text-[15px]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="tg-hint text-sm tabular-nums">{count}</span>
      </button>
    </li>
  );
}

export function PackCard({ pack, saved, onSave, className }: { pack: LibraryPack; saved: boolean; onSave: () => void; className?: string }) {
  const [hot, setHot] = useState(false);
  return (
    <article
      className={cn("tg-glass flex flex-col rounded-2xl p-3.5", className)}
      onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)} onBlur={() => setHot(false)}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold"><Link href={`/emoji/${pack.name}`} className="rounded hover:underline">{pack.title}</Link></h3>
          <p className="tg-hint truncate text-[13px]">
            {pack.count} emoji · {pack.formats.map((f) => FORMAT_LABEL[f]).join(", ")}{pack.adaptiveShare >= 0.5 ? " · ◐ any theme" : ""}{pack.covers.length >= 6 ? ` · ${pack.covers.length}/${BOT_SLOTS.length} bot icons` : ""}
          </p>
        </div>
        <button
          type="button" onClick={onSave} aria-pressed={saved} aria-label={saved ? `Remove ${pack.title} from saved` : `Save ${pack.title}`}
          className="tg-cell -mt-1 -mr-1 inline-flex size-9 items-center justify-center rounded-full"
        >
          <Star aria-hidden="true" className={cn("size-[18px]", saved ? "fill-amber-400 text-amber-500" : "tg-hint")} />
        </button>
      </div>
      <Link href={`/emoji/${pack.name}`} tabIndex={-1} aria-hidden="true" className="mt-2.5 grid grid-cols-8 gap-1">
        {pack.sample.map((e) => <PremiumEmoji key={e.id} emoji={e} active={hot} size={28} className="mx-auto" />)}
      </Link>
      <div className="mt-auto flex items-center gap-4 pt-3">
        <Link href={`/emoji/${pack.name}`} className="tg-button inline-flex h-8 items-center rounded-full px-4 text-sm font-medium">Open pack</Link>
        <a href={pack.link} target="_blank" rel="noopener noreferrer" className="tg-accent rounded text-sm hover:underline">Add to Telegram</a>
        {pack.count > pack.sample.length ? <span className="tg-hint ml-auto text-xs">+{pack.count - pack.sample.length}</span> : null}
      </div>
    </article>
  );
}

function HitTile({ hit }: { hit: EmojiHit }) {
  const [hot, setHot] = useState(false);
  return (
    <li>
      <Link
        href={`/emoji/${hit.pack}#e=${hit.id}`} title={`${hit.fallback} · ${hit.pack}`} aria-label={`${hit.fallback || "emoji"} from ${hit.pack}`}
        onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)} onFocus={() => setHot(true)} onBlur={() => setHot(false)}
        className="tg-cell flex aspect-square items-center justify-center rounded-xl"
      >
        <PremiumEmoji emoji={{ ...hit, preview: hit.preview, animation: hit.animation }} active={hot} size={36} />
      </Link>
    </li>
  );
}

function Suggestions({ data, onPick, onCategory }: { data: SearchResult; onPick: (q: string) => void; onCategory: (c: string) => void }) {
  const { complete, related, categories, didYouMean } = data.suggest;
  if (!didYouMean && !complete.length && !related.length && !categories.length) return null;
  const chip = "tg-glass inline-flex h-8 shrink-0 items-center rounded-full px-3 text-sm";
  return (
    <div className="space-y-2 px-1">
      {didYouMean ? (
        <p className="text-sm">Did you mean <button type="button" onClick={() => onPick(didYouMean)} className="tg-accent rounded font-medium underline-offset-4 hover:underline">{didYouMean}</button>?</p>
      ) : null}
      <div className="tg-scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {categories.map((c) => <button key={`c-${c}`} type="button" onClick={() => onCategory(c)} className={cn(chip, "tg-accent")}>{c}</button>)}
        {complete.map((w) => <button key={`w-${w}`} type="button" onClick={() => onPick(w)} className={chip}><Search aria-hidden="true" className="tg-hint mr-1.5 size-3.5" />{w}</button>)}
        {related.map((w) => <button key={`r-${w}`} type="button" onClick={() => onPick(w)} className={chip}><Sparkles aria-hidden="true" className="tg-hint mr-1.5 size-3.5" />{w}</button>)}
      </div>
    </div>
  );
}

export function LibraryApp({ packs, categories, collections }: { packs: LibraryPack[]; categories: string[]; collections: Collection[] }) {
  const { saved, togglePack } = useSaved();
  const [view, setView] = useState<View>({ kind: "all" });
  const [format, setFormat] = useState<Format>("any");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const q = useDeferredValue(query);
  const byName = useMemo(() => new Map(packs.map((p) => [p.name, p])), [packs]);
  const { data, loading, failed } = useEmojiSearch(q);
  const searching = !!q.trim();
  const order = new Map((data?.packs ?? []).map((p, i) => [p.name, i]));
  const isSaved = (p: LibraryPack) => saved.packs.includes(p.name);

  const inView = (p: LibraryPack, v: View) =>
    v.kind === "all" ? true
    : v.kind === "saved" ? isSaved(p)
    : v.kind === "category" ? p.category === v.name
    : (collections.find((c) => c.id === v.id)?.packs ?? []).includes(p.name);
  const base = packs.filter((p) => formatOk(p, format) && (!searching || order.has(p.name)));
  if (searching) base.sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0));
  const count = (v: View) => base.filter((p) => inView(p, v)).length;
  let shown = base.filter((p) => inView(p, view));
  if (view.kind === "collection" && !searching) {
    const order = collections.find((c) => c.id === view.id)?.packs ?? [];
    shown = [...shown].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }
  const firstScreen = view.kind === "all" && !q && format === "any";
  // The grid renders a page at a time; the page count resets when the list changes.
  const listKey = JSON.stringify([view, format, q]);
  const [more, setMore] = useState({ key: listKey, n: PAGE });
  const limit = more.key === listKey ? more.n : PAGE;
  const title = view.kind === "all" ? "All packs" : view.kind === "saved" ? "Saved"
    : view.kind === "category" ? view.name : collections.find((c) => c.id === view.id)?.title ?? "";
  const iconOf = (category: string) => packs.find((p) => p.category === category)?.sample[0];
  const same = (v: View) => JSON.stringify(v) === JSON.stringify(view);

  const nav = (
    <>
      <p className="tg-section-title px-2.5 pt-1 pb-1">Library</p>
      <ul>
        <Cell active={same({ kind: "all" })} onClick={() => setView({ kind: "all" })} icon={<LayoutGrid aria-hidden="true" className="tg-accent size-5" />} label="All packs" count={count({ kind: "all" })} />
        <Cell active={same({ kind: "saved" })} onClick={() => setView({ kind: "saved" })} icon={<Bookmark aria-hidden="true" className="tg-accent size-5" />} label="Saved" count={count({ kind: "saved" })} />
      </ul>
      {collections.length ? <p className="tg-section-title px-2.5 pt-3 pb-1">Collections</p> : null}
      <ul>
        {collections.map((c) => {
          const lead = byName.get(c.packs[0])?.sample[0];
          return <Cell key={c.id} active={same({ kind: "collection", id: c.id })} onClick={() => setView({ kind: "collection", id: c.id })}
            icon={lead ? <PremiumEmoji emoji={lead} size={24} /> : null} label={c.title} count={count({ kind: "collection", id: c.id })} />;
        })}
      </ul>
      {categories.length > 1 ? <p className="tg-section-title px-2.5 pt-3 pb-1">Categories</p> : null}
      <ul>
        {categories.length > 1 ? categories.map((c) => {
          const icon = iconOf(c);
          return <Cell key={c} active={same({ kind: "category", name: c })} onClick={() => setView({ kind: "category", name: c })}
            icon={icon ? <PremiumEmoji emoji={icon} size={24} /> : null} label={c} count={count({ kind: "category", name: c })} />;
        }) : null}
      </ul>
    </>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside aria-label="Browse" className="tg-glass hidden self-start rounded-2xl p-2 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">
        {nav}
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="tg-glass flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search packs and emoji</span>
            <Search aria-hidden="true" className="tg-hint pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2" />
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search emoji: cart, arrow, heart, 🔥"
              className="tg-field h-10 w-full rounded-xl pr-9 pl-10 text-[15px] outline-none"
            />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="tg-hint absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1">
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </label>
          <div role="radiogroup" aria-label="Format" className="tg-field flex rounded-xl p-0.5 text-sm">
            {(["any", "animated", "static"] as const).map((f) => (
              <button
                key={f} type="button" role="radio" aria-checked={format === f} onClick={() => setFormat(f)}
                className={cn("h-9 flex-1 rounded-[10px] px-3 font-medium transition-colors", format === f ? "tg-glass-strong shadow-sm" : "tg-hint")}
              >
                {f === "any" ? "All" : f === "animated" ? "Animated" : "Static"}
              </button>
            ))}
          </div>
        </div>

        <nav aria-label="Browse" className="tg-scroll-x -mx-3 flex gap-1.5 overflow-x-auto px-3 lg:hidden">
          {[{ v: { kind: "all" } as View, l: "All" }, { v: { kind: "saved" } as View, l: "Saved" },
            ...collections.map((c) => ({ v: { kind: "collection", id: c.id } as View, l: c.title })),
            ...(categories.length > 1 ? categories.map((c) => ({ v: { kind: "category", name: c } as View, l: c })) : [])].map(({ v, l }) => (
            <button key={l} type="button" aria-pressed={same(v)} onClick={() => setView(v)}
              className={cn("tg-glass shrink-0 rounded-full px-3.5 py-1.5 text-sm", same(v) && "tg-button")}>
              {l}
            </button>
          ))}
        </nav>

        {firstScreen ? collections.map((c) => (
          <section key={c.id} aria-labelledby={`col-${c.id}`}>
            <div className="mb-2 flex items-end gap-3 px-1">
              <div className="min-w-0 flex-1">
                <h2 id={`col-${c.id}`} className="text-lg font-semibold">{c.title}</h2>
                <p className="tg-hint text-[13px]">{c.hint}</p>
              </div>
              <button type="button" onClick={() => setView({ kind: "collection", id: c.id })} className="tg-accent inline-flex items-center gap-0.5 rounded text-sm">
                See all <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="tg-scroll-x -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1">
              {c.packs.slice(0, 8).map((n) => byName.get(n)).filter((p): p is LibraryPack => !!p).map((p) => (
                <PackCard key={p.name} pack={p} saved={isSaved(p)} onSave={() => togglePack(p.name)} className="w-[19rem] shrink-0 snap-start" />
              ))}
            </div>
          </section>
        )) : null}

        {searching && data ? (
          <Suggestions data={data} onPick={setQuery} onCategory={(c) => { setView({ kind: "category", name: c }); setQuery(""); }} />
        ) : null}

        {searching ? (
          <section aria-labelledby="hits-title" className="tg-glass rounded-2xl p-3">
            <div className="mb-2 flex items-center gap-2 px-1">
              <h2 id="hits-title" className="text-[15px] font-semibold">Emoji</h2>
              <span className="tg-hint text-sm">{data ? `${data.total.toLocaleString("en-US")} found` : ""}</span>
              {loading ? <Loader2 aria-label="Searching" className="tg-hint size-4 animate-spin motion-reduce:animate-none" /> : null}
            </div>
            {failed ? <p className="tg-hint px-1 py-4 text-sm">Search is not available right now. Try again in a moment.</p>
              : data && data.emoji.length ? (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1">
                  {data.emoji.map((h) => <HitTile key={`${h.pack}/${h.id}`} hit={h} />)}
                </ul>
              ) : data ? <p className="tg-hint px-1 py-4 text-sm">No emoji match. Try a simpler word, the emoji itself, or another language.</p> : null}
          </section>
        ) : null}

        <section aria-labelledby="grid-title">
          <div className="mb-2 flex flex-wrap items-center gap-3 px-1">
            <h2 id="grid-title" className="text-lg font-semibold">{searching ? "Packs" : title}</h2>
            <span className="tg-hint text-sm">{shown.length} packs</span>
            {view.kind === "saved" && shown.length ? (
              <button
                type="button"
                onClick={async () => { if (await copy(shown.map((p) => `bot-ui emoji import ${p.link}`).join("\n"))) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
                className="tg-accent ml-auto inline-flex items-center gap-1.5 rounded text-sm"
              >
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />} Copy bot-ui import commands
              </button>
            ) : null}
          </div>
          <p aria-live="polite" className="sr-only">{shown.length} packs shown</p>
          {shown.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.slice(0, limit).map((p) => <PackCard key={p.name} pack={p} saved={isSaved(p)} onSave={() => togglePack(p.name)} />)}
            </div>
          ) : null}
          {shown.length > limit ? (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={() => setMore({ key: listKey, n: limit + PAGE })}
                className="tg-glass tg-accent h-10 rounded-full px-5 text-sm font-medium">
                Show more · {shown.length - limit} left
              </button>
            </div>
          ) : null}
          {!shown.length ? (
            <p className="tg-glass tg-hint rounded-2xl px-4 py-10 text-center text-sm">
              {!packs.length ? "No packs in the library yet."
                : view.kind === "saved" && !saved.packs.length ? "Nothing saved yet. Tap the star on a pack to keep it here; it stays in this browser."
                : "No pack matches. Try another word or the emoji itself."}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
