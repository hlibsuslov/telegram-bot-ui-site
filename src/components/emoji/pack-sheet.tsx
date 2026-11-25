"use client";

// One pack at /emoji/<name>, laid out like Telegram's "Add emoji" sheet (grid, blue button at
// the bottom) with an analysis column: formats, the bot icons the pack covers, the picked emoji
// with everything a bot needs to use it, and similar packs below.
import { type ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Bookmark, Play, Search, Star } from "lucide-react";
import type { CardPack } from "@/lib/emoji-card";
import type { LibraryEmoji, LibraryPack } from "@/lib/emoji-library";
import { buttonEmojiField, messageEmojiHtml } from "@/lib/emoji-snippets";
import { BOT_SLOTS, stripVariation } from "@/lib/emoji-slots";
import { cn } from "@/lib/utils";
import { CopyRow } from "./copy-row";
import { matches, PackCard } from "./library-app";
import { isMouse, PremiumEmoji, useCanHover } from "./premium-emoji";
import { useSaved } from "./saved";

const FORMAT = { static: { label: "Static", color: "#8e8e93" }, animated: { label: "Animated", color: "#3390ec" }, video: { label: "Video", color: "#34c759" } } as const;

/** An emoji of the grid. A mouse plays it on hover; a touch screen plays the one tapped (picked), so
 *  a phone runs one or two animations at a time instead of every one a finger passes. */
function Tile({ e, selected, all, canHover, onSelect }: { e: LibraryEmoji; selected: boolean; all: boolean; canHover: boolean; onSelect: () => void }) {
  const [hot, setHot] = useState(false);
  return (
    <li id={`emoji-${e.id}`} className="scroll-mt-24">
      <button
        id={`e=${e.id}`} type="button" onClick={onSelect} aria-pressed={selected} aria-label={`${FORMAT[e.format].label} ${e.fallback || "emoji"}, custom emoji ID ${e.id}`}
        onPointerEnter={(ev) => isMouse(ev) && setHot(true)} onPointerLeave={() => setHot(false)}
        onFocus={(ev) => ev.currentTarget.matches(":focus-visible") && setHot(true)} onBlur={() => setHot(false)}
        className={cn("tg-cell flex aspect-square w-full scroll-mt-24 items-center justify-center rounded-xl", selected && "ring-2 ring-[var(--tg-accent)]")}
      >
        <PremiumEmoji emoji={e} play={all ? "always" : "hover"} active={hot || (!canHover && selected)} size={40} />
      </button>
    </li>
  );
}

/** How the pack sits in a Telegram chat in each theme: a message and two buttons on the light and dark
 *  wallpapers. Adaptive emoji take the text colour of each theme, as Telegram repaints them. */
function ThemePreview({ emoji, pick }: { emoji: LibraryEmoji[]; pick: LibraryEmoji | null }) {
  const lead = pick ?? emoji[0];
  const rest = emoji.filter((e) => e.id !== lead?.id).slice(0, 7);
  if (!lead) return null;
  const themes = [
    { tone: "light" as const, label: "Light theme", wall: "linear-gradient(135deg,#dbddbb,#6ba587 55%,#d5d88d)", bubble: "#ffffff", text: "#000000", hint: "#8a8a8a", btn: "rgba(255,255,255,0.28)" },
    { tone: "dark" as const, label: "Dark theme", wall: "linear-gradient(135deg,#1b2a1f,#20323a 55%,#2b2640)", bubble: "#212121", text: "#ffffff", hint: "#9a9a9a", btn: "rgba(0,0,0,0.32)" },
  ];
  return (
    <section aria-labelledby="themes-title">
      <div className="mb-2 px-1">
        <h2 id="themes-title" className="text-lg font-semibold">In Telegram themes</h2>
        <p className="tg-hint text-[13px]">
          {emoji.some((e) => e.adaptive) ? "Adaptive emoji take the text colour, so they read in both themes." : "This pack keeps its own colours in both themes."}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {themes.map((t) => (
          <figure key={t.tone} className="tg-glass overflow-hidden rounded-3xl p-1.5">
            <div className="rounded-[20px] p-4" style={{ background: t.wall }}>
              <div className="max-w-[20rem] rounded-2xl rounded-bl-md px-3 py-2 text-[15px] shadow-sm" style={{ background: t.bubble, color: t.text }}>
                <p className="flex items-center gap-1.5 font-semibold">
                  <PremiumEmoji emoji={lead} tone={t.tone} size={22} /> Your order is ready
                </p>
                <p className="mt-1 leading-7">
                  Pick it up at the bar{" "}
                  {rest.slice(0, 5).map((e) => <PremiumEmoji key={e.id} emoji={e} tone={t.tone} size={20} className="align-[-0.3em]" />)}
                </p>
                <p className="mt-0.5 text-right text-[11px]" style={{ color: t.hint }}>12:04</p>
              </div>
              <div className="mt-1 grid max-w-[20rem] grid-cols-2 gap-1">
                {rest.slice(5, 7).concat(rest.length < 7 ? [lead] : []).slice(0, 2).map((e, i) => (
                  <span key={`${e.id}-${i}`} className="flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-white backdrop-blur" style={{ background: t.btn }}>
                    <PremiumEmoji emoji={e} tone="dark" size={18} /> {i ? "Details" : "Menu"}
                  </span>
                ))}
              </div>
            </div>
            <figcaption className="tg-hint px-3 py-1.5 text-[13px]">{t.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function PackSheet({ pack, emoji, similar, pageUrl, about }: { pack: LibraryPack; emoji: LibraryEmoji[]; similar: CardPack[]; pageUrl: string; about?: ReactNode }) {
  const { saved, togglePack, toggleEmoji } = useSaved();
  const canHover = useCanHover();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const [pick, setPick] = useState<LibraryEmoji | null>(emoji[0] ?? null);
  const q = useDeferredValue(query);
  const shown = useMemo(() => emoji.filter((e) => matches(e.search, q)), [emoji, q]);
  const hasMotion = pack.formats.some((f) => f !== "static");
  const packSaved = saved.packs.includes(pack.name);
  const emojiSaved = !!pick && saved.emoji.some((x) => x.id === pick.id);

  // A search result links here as #e=<id>: open the pack on that emoji.
  useEffect(() => {
    function selectFromHash() {
      const id = /^#e=(\d{1,20})$/.exec(window.location.hash)?.[1];
      const target = id ? emoji.find((e) => e.id === id) : undefined;
      if (!target) return;
      setPick(target);
      document.getElementById(`e=${target.id}`)?.scrollIntoView({ block: "center" });
    }
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [emoji]);

  const formatCounts = (["animated", "video", "static"] as const).map((f) => ({ f, n: emoji.filter((e) => e.format === f).length })).filter((x) => x.n);
  const adaptive = emoji.filter((e) => e.adaptive).length;
  const slots = BOT_SLOTS.map(([slot, signs]) => {
    const keys = new Set(signs.map(stripVariation));
    return { slot, e: emoji.find((x) => keys.has(stripVariation(x.fallback))) };
  });
  const covered = slots.filter((s) => s.e).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-labelledby="pack-title" className="tg-glass flex min-w-0 flex-col rounded-3xl">
          <div className="px-4 pt-4 sm:px-5">
            <h1 id="pack-title" className="text-xl font-semibold text-balance">{pack.title}</h1>
            <p className="tg-hint mt-0.5 text-[13px]">{pack.count} emoji · {pack.category} · t.me/addemoji/{pack.name}</p>
            {about}
            <div className="mt-3 flex gap-2">
              <label className="relative flex-1">
                <span className="sr-only">Search this pack</span>
                <Search aria-hidden="true" className="tg-hint pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this pack"
                  className="tg-field h-10 w-full rounded-xl pr-3 pl-10 text-[15px] outline-none" />
              </label>
              {hasMotion ? (
                <button type="button" aria-pressed={all} onClick={() => setAll((v) => !v)}
                  className={cn("inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium", all ? "tg-button" : "tg-field")}>
                  <Play aria-hidden="true" className="size-4" /> {all ? "Playing" : "Play all"}
                </button>
              ) : null}
            </div>
            <p className="tg-hint mt-2 text-xs">{hasMotion ? (canHover ? "Hover or focus an emoji to see it move." : "Tap an emoji to see it move.") : "This pack is static."} {shown.length} of {emoji.length} shown.</p>
          </div>
          {shown.length ? (
            <ul className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] content-start gap-1 px-3 py-3 sm:px-4">
              {shown.map((e) => <Tile key={e.id} e={e} selected={pick?.id === e.id} all={all} canHover={canHover} onSelect={() => setPick(e)} />)}
            </ul>
          ) : (
            <p className="tg-hint flex-1 px-5 py-10 text-center text-sm">No emoji in this pack match. Try the emoji itself.</p>
          )}
          <div className="sticky bottom-3 mx-3 mb-3 flex gap-2 sm:mx-4 sm:mb-4">
            <a href={pack.link} target="_blank" rel="noopener noreferrer"
              className="tg-button flex h-12 flex-1 items-center justify-center rounded-2xl text-[15px] font-semibold shadow-lg">
              Add {pack.count} emoji to Telegram
            </a>
            <button type="button" onClick={() => togglePack(pack.name)} aria-pressed={packSaved} aria-label={packSaved ? "Remove pack from saved" : "Save pack"}
              className="tg-glass inline-flex size-12 items-center justify-center rounded-2xl">
              <Bookmark aria-hidden="true" className={cn("size-5", packSaved ? "fill-[var(--tg-accent)] tg-accent" : "tg-hint")} />
            </button>
          </div>
        </section>

        <aside aria-label="About this pack" className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {pick ? (
            <section key={pick.id} aria-label="Picked emoji" className="tg-glass space-y-3 rounded-3xl p-4">
              <div className="flex items-center gap-3">
                <span className="tg-field flex size-20 items-center justify-center rounded-2xl">
                  <PremiumEmoji key={pick.id} emoji={pick} play="always" size={60} />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">Stands for {pick.fallback || "—"}</p>
                  <p className="tg-hint">{pick.format === "animated" ? "Animated (TGS)" : pick.format === "video" ? "Video (WEBM)" : "Static"}{pick.adaptive ? " · text color" : ""}</p>
                  <button type="button" onClick={() => toggleEmoji({ id: pick.id, fallback: pick.fallback, pack: pack.name })}
                    className="tg-accent mt-1 inline-flex items-center gap-1 rounded text-[13px]">
                    <Star aria-hidden="true" className={cn("size-3.5", emojiSaved && "fill-amber-400 text-amber-500")} /> {emojiSaved ? "Saved" : "Save emoji"}
                  </button>
                </div>
              </div>
              <CopyRow label="Custom emoji ID" value={pick.id} />
              {pick.fallback && <CopyRow label="In a message (HTML)" accessibleLabel="Telegram message HTML" value={messageEmojiHtml(pick.id, pick.fallback)} />}
              <CopyRow label="On a button" accessibleLabel="icon_custom_emoji_id button field" value={buttonEmojiField(pick.id)} />
              <CopyRow label="Emoji source link" value={`${pageUrl}#e=${pick.id}`} />
              {pick.tags.length ? <p className="tg-hint text-xs">Tags: {pick.tags.join(", ")}</p> : null}
            </section>
          ) : null}

          <section aria-label="Analysis" className="tg-glass space-y-4 rounded-3xl p-4">
            <div>
              <p className="tg-section-title mb-2">Formats</p>
              <div className="flex h-2 overflow-hidden rounded-full" role="img" aria-label={formatCounts.map((x) => `${x.n} ${FORMAT[x.f].label.toLowerCase()}`).join(", ")}>
                {formatCounts.map((x) => <span key={x.f} style={{ width: `${(x.n / emoji.length) * 100}%`, background: FORMAT[x.f].color }} />)}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {formatCounts.map((x) => (
                  <li key={x.f} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: FORMAT[x.f].color }} />{FORMAT[x.f].label} <span className="tg-hint tabular-nums">{x.n}</span></li>
                ))}
              </ul>
              <p className="tg-hint mt-2 text-[13px]">{pack.meanings} distinct meanings{adaptive ? ` · ${adaptive} take the text color` : ""}</p>
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="tg-section-title">Bot interface icons</p>
                <p className="text-[13px] font-medium tabular-nums">{covered} / {BOT_SLOTS.length}</p>
              </div>
              <ul className="grid grid-cols-4 gap-1">
                {slots.map(({ slot, e }) => (
                  <li key={slot}>
                    <button type="button" disabled={!e} onClick={() => e && setPick(e)} aria-label={e ? `${slot}: pick this emoji` : `${slot}: not in this pack`}
                      className={cn("flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px]", e ? "tg-cell" : "opacity-40")}>
                      {e ? <PremiumEmoji emoji={e} size={24} /> : <span className="tg-hint flex size-6 items-center justify-center">—</span>}
                      <span className="tg-hint truncate">{slot}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-label="Import" className="tg-glass rounded-3xl p-4">
            <CopyRow label="Import into bot-ui Studio" value={`bot-ui emoji import ${pack.link}`} />
          </section>
        </aside>
      </div>

      <ThemePreview emoji={emoji} pick={pick} />

      {similar.length ? (
        <section aria-labelledby="similar-title">
          <h2 id="similar-title" className="mb-2 px-1 text-lg font-semibold">Similar packs</h2>
          <div className="tg-scroll-x -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1">
            {similar.map((p) => (
              <PackCard key={p.name} pack={p} saved={saved.packs.includes(p.name)} onSave={togglePack} className="w-[19rem] shrink-0 snap-start 2xl:w-[22rem]" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
