"use client";

// One pack at /emoji/<name>: every emoji, playing on hover (or all at once), a search inside the
// pack, and a panel with what a bot needs: the id, the HTML for text, the button field.
import { useDeferredValue, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Play, Search, Star } from "lucide-react";
import type { LibraryEmoji, LibraryPack } from "@/lib/emoji-library";
import { cn } from "@/lib/utils";
import { matches } from "./library-browser";
import { PremiumEmoji } from "./premium-emoji";
import { copy, useSaved } from "./saved";

const FORMAT_LABEL = { static: "Static", animated: "Animated (TGS)", video: "Video (WEBM)" } as const;

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1 rounded-md border border-border bg-background pl-2.5">
        <code className="min-w-0 flex-1 truncate py-1.5 font-mono text-xs">{value}</code>
        <button
          type="button" aria-label={`Copy ${label}`}
          onClick={async () => { if (await copy(value)) { setDone(true); setTimeout(() => setDone(false), 1500); } }}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {done ? <Check aria-hidden="true" className="size-4 text-emerald-600" /> : <Copy aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function Tile({ e, selected, all, onSelect }: { e: LibraryEmoji; selected: boolean; all: boolean; onSelect: () => void }) {
  const [hot, setHot] = useState(false);
  return (
    <li>
      <button
        type="button" onClick={onSelect} aria-pressed={selected} aria-label={`${e.fallback || "emoji"} ${e.id}`}
        onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)} onFocus={() => setHot(true)} onBlur={() => setHot(false)}
        className={cn(
          "flex aspect-square w-full items-center justify-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          selected && "bg-muted ring-2 ring-brand",
        )}
      >
        <PremiumEmoji emoji={e} play={all ? "always" : "hover"} active={hot} size={40} />
      </button>
    </li>
  );
}

export function PackBrowser({ pack, emoji }: { pack: LibraryPack; emoji: LibraryEmoji[] }) {
  const { saved, togglePack, toggleEmoji } = useSaved();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const [pick, setPick] = useState<LibraryEmoji | null>(emoji[0] ?? null);
  const q = useDeferredValue(query);
  const shown = useMemo(() => emoji.filter((e) => matches(e.search, q)), [emoji, q]);
  const hasMotion = pack.formats.some((f) => f !== "static");
  const packSaved = saved.packs.includes(pack.name);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search this pack</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this pack: arrow, check, 🛒 …"
              className="h-10 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          {hasMotion ? (
            <button
              type="button" aria-pressed={all} onClick={() => setAll((v) => !v)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                all ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted",
              )}
            >
              <Play aria-hidden="true" className="size-4" /> {all ? "Playing all" : "Play all"}
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{hasMotion ? "Hover or focus an emoji to see it move." : "This pack is static."} {shown.length} of {emoji.length} shown.</p>
        {shown.length ? (
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1">
            {shown.map((e) => <Tile key={e.id} e={e} selected={pick?.id === e.id} all={all} onSelect={() => setPick(e)} />)}
          </ul>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No emoji in this pack match. Try the emoji itself.</p>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button" onClick={() => togglePack(pack.name)} aria-pressed={packSaved}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Star aria-hidden="true" className={cn("size-4", packSaved && "fill-amber-400 text-amber-500")} /> {packSaved ? "Saved" : "Save pack"}
            </button>
            <a
              href={pack.link} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-medium text-white outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Add to Telegram <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </div>
          <CopyRow label="Import into bot-ui Studio" value={`bot-ui emoji import ${pack.link}`} />
        </div>

        {pick ? (
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-20 items-center justify-center rounded-lg bg-muted">
                <PremiumEmoji key={pick.id} emoji={pick} play="always" size={64} />
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium">Stands for {pick.fallback || "—"}</p>
                <p className="text-muted-foreground">{FORMAT_LABEL[pick.format]}{pick.adaptive ? " · takes the text color" : ""}</p>
                <button
                  type="button" onClick={() => toggleEmoji({ id: pick.id, fallback: pick.fallback, pack: pack.name })}
                  className="mt-1 inline-flex items-center gap-1 rounded text-xs font-medium text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Star aria-hidden="true" className={cn("size-3", saved.emoji.some((x) => x.id === pick.id) && "fill-amber-400 text-amber-500")} />
                  {saved.emoji.some((x) => x.id === pick.id) ? "Saved emoji" : "Save this emoji"}
                </button>
              </div>
            </div>
            <CopyRow label="Custom emoji ID" value={pick.id} />
            <CopyRow label="In a message (HTML)" value={`<tg-emoji emoji-id="${pick.id}">${pick.fallback}</tg-emoji>`} />
            <CopyRow label="On a button" value={`"icon_custom_emoji_id": "${pick.id}"`} />
            {pick.tags.length ? <p className="text-xs text-muted-foreground">Tags: {pick.tags.join(", ")}</p> : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
