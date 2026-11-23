"use client";

// The /emoji index: search across packs (titles, tags and what each emoji stands for), filter by
// format or by what this visitor saved, and open a pack. Hovering a card plays its sample.
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Search, Star } from "lucide-react";
import type { LibraryPack } from "@/lib/emoji-library";
import { cn } from "@/lib/utils";
import { FilterChips } from "./filter-chips";
import { PremiumEmoji } from "./premium-emoji";
import { copy, useSaved } from "./saved";

const FORMAT_LABEL = { static: "Static", animated: "Animated", video: "Video" } as const;

export function matches(search: string, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((t) => search.includes(t));
}

function PackCard({ pack, saved, onSave }: { pack: LibraryPack; saved: boolean; onSave: () => void }) {
  const [hot, setHot] = useState(false);
  return (
    <li
      className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md focus-within:ring-3 focus-within:ring-ring/40"
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            <Link href={`/emoji/${pack.name}`} className="outline-none after:absolute after:inset-0 after:rounded-xl">{pack.title}</Link>
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {pack.name} · {pack.count} emoji · {pack.formats.map((f) => FORMAT_LABEL[f]).join(", ")}
          </p>
        </div>
        <button
          type="button" onClick={onSave} aria-pressed={saved} aria-label={saved ? `Remove ${pack.title} from saved` : `Save ${pack.title}`}
          className="relative z-10 -mt-1 -mr-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Star aria-hidden="true" className={cn("size-4", saved && "fill-amber-400 text-amber-500")} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-8 gap-1">
        {pack.sample.map((e) => <PremiumEmoji key={e.id} emoji={e} active={hot} size={30} className="mx-auto" />)}
      </div>
      <a
        href={pack.link} target="_blank" rel="noopener noreferrer"
        className="relative z-10 mt-3 inline-flex w-fit items-center gap-1 rounded-md text-xs font-medium text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Add to Telegram <ExternalLink aria-hidden="true" className="size-3" />
      </a>
    </li>
  );
}

export function LibraryBrowser({ packs }: { packs: LibraryPack[] }) {
  const { saved, togglePack } = useSaved();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const q = useDeferredValue(query);

  const tests: Record<string, (p: LibraryPack) => boolean> = {
    all: () => true,
    animated: (p) => p.formats.includes("animated") || p.formats.includes("video"),
    static: (p) => p.formats.length === 1 && p.formats[0] === "static",
    saved: (p) => saved.packs.includes(p.name),
  };
  const found = useMemo(() => packs.filter((p) => matches(p.search, q)), [packs, q]);
  const chips = [
    { id: "all", label: "All" }, { id: "animated", label: "Animated" }, { id: "static", label: "Static" }, { id: "saved", label: "Saved" },
  ].map((c) => ({ ...c, count: found.filter(tests[c.id]).length }));
  const shown = found.filter(tests[filter] ?? tests.all);
  const savedPacks = packs.filter((p) => saved.packs.includes(p.name));

  const copyOut = async (kind: string, text: string) => {
    if (await copy(text)) { setCopied(kind); setTimeout(() => setCopied(null), 1600); }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search packs and emoji</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: cart, arrow, heart, logo, 🔥 …"
            className="h-10 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <FilterChips chips={chips} value={filter} onChange={setFilter} label="Show packs" />
      </div>

      {filter === "saved" && savedPacks.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 text-muted-foreground">Saved in this browser only. Take them to your bot:</span>
          <button type="button" onClick={() => void copyOut("links", savedPacks.map((p) => p.link).join("\n"))} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50">
            {copied === "links" ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />} Copy links
          </button>
          <button type="button" onClick={() => void copyOut("cli", savedPacks.map((p) => `bot-ui emoji import ${p.link}`).join("\n"))} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50">
            {copied === "cli" ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />} Copy bot-ui commands
          </button>
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">{shown.length} packs shown</p>
      {shown.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => <PackCard key={p.name} pack={p} saved={saved.packs.includes(p.name)} onSave={() => togglePack(p.name)} />)}
        </ul>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {!packs.length ? "No packs in the library yet."
            : filter === "saved" && !saved.packs.length ? "Nothing saved yet: tap the star on a pack to keep it here."
            : "No pack matches. Try another word or the emoji itself."}
        </p>
      )}
    </div>
  );
}
