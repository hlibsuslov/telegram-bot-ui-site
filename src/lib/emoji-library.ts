// The premium emoji library at /emoji: packs listed in src/content/emoji-packs.txt (one link per
// line, kept by hand), read through the resolver, with search text built on the server.
// Search covers the pack title and name, the tags in emoji-tags.txt, and the keywords of the
// ordinary emoji each custom emoji stands for (emojilib), so "cart" finds a custom 🛒.
import "server-only";
import emojilib from "emojilib";
import { cacheLife } from "next/cache";
import packsText from "@/content/emoji-packs.txt";
import tagsText from "@/content/emoji-tags.txt";
import { fixturesOn } from "./emoji-fixtures";
import { PACK_NAME, resolvePack, type Format, type PackEmoji } from "./emoji-pack";

const LINK = /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/addemoji\/([A-Za-z0-9_]{1,64})\/?(?:[?#].*)?$/i;
const SAMPLE = 16;   // two rows of 8 on a pack card
const FIXTURE_PACKS = ["bot_ui_demo_icons", "bot_ui_demo_motion", "bot_ui_demo_status"];

export interface LibraryEmoji extends PackEmoji { tags: string[]; search: string }
export interface LibraryPack {
  name: string; title: string; link: string; count: number; formats: Format[]; adaptive: boolean;
  tags: string[]; sample: LibraryEmoji[]; search: string;
}
export interface Library { packs: LibraryPack[]; listed: number; unavailable: string[] }

/** Pack names from the links file, in file order, without duplicates (case-insensitive). */
export function parsePackList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const name = LINK.exec(line)?.[1] ?? line;
    if (!PACK_NAME.test(name) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

/** Tags by "pack" and "pack/emojiId" from emoji-tags.txt; keys are lowercase. */
export function parseTags(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const colon = line.indexOf(":");
    if (!line || line.startsWith("#") || colon < 1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const tags = line.slice(colon + 1).split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 30);
    if (tags.length) out.set(key, [...(out.get(key) ?? []), ...tags]);
  }
  return out;
}

const strip = (s: string) => s.replace(/[︎️]/g, "");
const keywordIndex = new Map(Object.entries(emojilib as Record<string, string[]>).map(([e, words]) => [strip(e), words]));

function keywords(fallback: string): string[] {
  return (keywordIndex.get(strip(fallback)) ?? []).map((w) => w.replace(/_/g, " "));
}

/** The packs file, or the local stand-in packs while developing with EMOJI_RESOLVER_FIXTURES=1. */
function listedNames(): string[] {
  return fixturesOn() ? FIXTURE_PACKS : parsePackList(packsText);
}

function withSearch(pack: string, e: PackEmoji, tags: Map<string, string[]>): LibraryEmoji {
  const own = tags.get(`${pack.toLowerCase()}/${e.id}`) ?? [];
  return { ...e, tags: own, search: [e.fallback, ...own, ...keywords(e.fallback)].join(" ").toLowerCase() };
}

async function readPack(name: string, tags: Map<string, string[]>): Promise<{ pack: LibraryPack; emoji: LibraryEmoji[] }> {
  const p = await resolvePack(name);
  const emoji = p.emoji.map((e) => withSearch(p.name, e, tags));
  const packTags = tags.get(p.name.toLowerCase()) ?? [];
  const formats = (["static", "animated", "video"] as const).filter((f) => emoji.some((e) => e.format === f));
  return {
    emoji,
    pack: {
      name: p.name, title: p.title, link: `https://t.me/addemoji/${p.name}`, count: emoji.length, formats,
      adaptive: emoji.some((e) => e.adaptive), tags: packTags, sample: emoji.slice(0, SAMPLE),
      search: [p.title, p.name, ...packTags, ...emoji.map((e) => e.search)].join(" ").toLowerCase(),
    },
  };
}

/** Every listed pack the resolver can read; the rest are reported, not shown. */
export async function getLibrary(): Promise<Library> {
  "use cache";
  cacheLife("hours");
  const names = listedNames();
  const tags = parseTags(tagsText);
  const results = await Promise.allSettled(names.map((n) => readPack(n, tags)));
  const packs: LibraryPack[] = [];
  const unavailable: string[] = [];
  results.forEach((r, i) => (r.status === "fulfilled" ? packs.push(r.value.pack) : unavailable.push(names[i])));
  return { packs, listed: names.length, unavailable };
}

/** One listed pack with all its emoji, or null when it is not in the list or cannot be read. */
export async function getLibraryPack(name: string): Promise<{ pack: LibraryPack; emoji: LibraryEmoji[] } | null> {
  "use cache";
  cacheLife("hours");
  const listed = listedNames().find((n) => n.toLowerCase() === name.toLowerCase());
  if (!listed) return null;
  try {
    return await readPack(listed, parseTags(tagsText));
  } catch {
    return null;
  }
}

export async function listedPackNames(): Promise<string[]> {
  return listedNames();
}
