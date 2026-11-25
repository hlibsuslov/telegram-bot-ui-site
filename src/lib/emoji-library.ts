// The premium emoji library at /emoji: packs listed in src/content/emoji-packs.txt (one link per
// line, grouped under "## Category" lines, kept by hand), read through the resolver, with search
// text built on the server. Search covers the pack title, name and category, the tags in
// emoji-tags.txt, and the keywords of the ordinary emoji each custom emoji stands for (emojilib),
// so "cart" finds a custom 🛒.
import "server-only";
import { cacheLife } from "next/cache";
import { CURATED_COLLECTIONS } from "@/content/emoji-collections";
import tagsText from "@/content/emoji-tags.txt";
import { toCardEmoji, type CardPack } from "./emoji-card";
import { resolvePack, type Format, type PackEmoji } from "./emoji-pack";
import { listedPacks, OTHER, type ListedPack } from "./emoji-pack-list";
import { emojiSearchText, type SearchSource } from "./emoji-search";
import { slotEmoji } from "./emoji-slots";
import { telegramPackUrl } from "./emoji-links";
import { emojiFacets, facetTokens, facetWords, packFacets, taxonomy } from "./emoji-facets";

const SAMPLE = 16; // two rows of 8 on a pack card

interface TaggedEmoji extends PackEmoji { tags: string[] }
export interface LibraryEmoji extends TaggedEmoji { search: string }
export interface LibraryPack {
  name: string; title: string; link: string; category: string; count: number; formats: Format[]; adaptive: boolean;
  /** position in the packs file: the list is kept most popular first */
  rank: number;
  /** share of emoji Telegram repaints in the text colour (needs_repainting): 1 = fits light and dark themes */
  adaptiveShare: number;
  /** distinct meanings (fallback emoji) in the pack */
  meanings: number;
  /** which common bot interface meanings the pack has an emoji for */
  covers: string[];
  tags: string[]; sample: PackEmoji[];
}
export interface Collection { id: string; title: string; hint: string; packs: string[] }
export interface Library {
  packs: LibraryPack[]; categories: string[]; collections: Collection[]; listed: number; unavailable: string[];
  /** everything the search engine needs; stays on the server */
  source: SearchSource;
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

let parsedTags: Map<string, string[]> | undefined;
const packTags = () => parsedTags ??= parseTags(tagsText);

const strip = (s: string) => s.replace(/[︎️]/g, "");

function coverage(fallbacks: Set<string>): string[] {
  return [...slotEmoji(fallbacks).keys()];
}

async function readPack({ name, category }: ListedPack, rank: number): Promise<{ pack: LibraryPack; emoji: TaggedEmoji[] }> {
  const p = await resolvePack(name);
  const tags = packTags();
  const key = p.name.toLowerCase();
  const emoji = p.emoji.map((e) => ({ ...e, tags: tags.get(`${key}/${e.id}`) ?? [] }));
  const formats = (["static", "animated", "video"] as const).filter((f) => emoji.some((e) => e.format === f));
  const fallbacks = new Set(emoji.map((e) => strip(e.fallback)).filter(Boolean));
  return {
    emoji,
    pack: {
      name: p.name, title: p.title, link: telegramPackUrl(p.name), category, count: emoji.length, formats,
      rank, meanings: fallbacks.size, covers: coverage(fallbacks),
      adaptive: emoji.some((e) => e.adaptive), adaptiveShare: emoji.length ? emoji.filter((e) => e.adaptive).length / emoji.length : 0,
      tags: tags.get(key) ?? [], sample: p.emoji.slice(0, SAMPLE),
    },
  };
}

// Packs are read a few at a time: hundreds at once would fill the resolver's queue (which refuses
// past its cap) and could trip Telegram's flood limit on a cold start.
const READ_PARALLEL = 6;

async function settledInBatches<T, R>(items: T[], parallel: number, work: (item: T, i: number) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: "fulfilled", value: await work(items[i], i) };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, items.length) }, worker));
  return out;
}

/** A pack as its card shows it, small enough to send hundreds to the browser. */
export function cardPack(p: LibraryPack): CardPack {
  return {
    name: p.name, title: p.title, category: p.category, count: p.count, formats: p.formats,
    adaptiveShare: Math.round(p.adaptiveShare * 100) / 100, covers: p.covers.length, sample: p.sample.map(toCardEmoji),
  };
}

/** Every listed pack the resolver can read; the rest are reported, not shown. Categories keep
 *  the file's order, "Other" last. */
export async function getLibrary(): Promise<Library> {
  "use cache";
  cacheLife("hours");
  const list = listedPacks();
  const results = await settledInBatches(list, READ_PARALLEL, readPack);
  const read: Awaited<ReturnType<typeof readPack>>[] = [];
  const unavailable: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      if (r.value.pack.count) read.push(r.value);
    } else {
      unavailable.push(list[i].name);
    }
  });
  // A Telegram outage or a 429 pause mid-refresh must not be cached as a smaller library for hours:
  // throw, so the cache keeps the previous library. Without a resolver token at all (a build that
  // has none yet) every pack fails the same way; that renders as an empty library instead.
  const off = results.every((r) => r.status === "rejected" && (r.reason as { code?: string })?.code === "RESOLVER_OFF");
  if (!off && unavailable.length > list.length * 0.2) {
    throw new Error(`emoji library: ${unavailable.length} of ${list.length} packs could not be read; keeping the previous library`);
  }
  const packs = read.map((r) => r.pack);
  const categories = [...new Set(packs.map((p) => p.category))].sort((a, b) => Number(a === OTHER) - Number(b === OTHER));
  const body = {
    packs: packs.map((p) => {
      const pf = packFacets(p.name)?.facets ?? {};
      return { name: p.name, title: p.title, category: p.category, rank: p.rank, tags: p.tags,
        fc: facetTokens(pf, taxonomy.thresholds.pack), fw: facetWords(pf, taxonomy.thresholds.show) };
    }),
    emoji: read.flatMap((r, p) => r.emoji.map((e) => {
      const ef = emojiFacets(r.pack.name, e.id);
      return { p, id: e.id, f: e.fallback, fmt: e.format, ad: e.adaptive, pv: !!e.preview, st: !!e.still, tags: e.tags,
        // motion and adaptivity straight from Telegram's data: fresher than the tag snapshot
        fc: [...facetTokens(ef, taxonomy.thresholds.emoji), `motion:${e.format}`, ...(e.adaptive ? ["fit:adaptive"] : [])],
        fw: facetWords(ef, taxonomy.thresholds.show) };
    })),
  };
  const source: SearchSource = { ...body, revision: revisionOf(JSON.stringify(body)) };
  return { packs, categories, collections: collections(packs), listed: list.length, unavailable, source };
}

/** Curated rows for the library's first screen, built from what the packs contain. */
function collections(packs: LibraryPack[]): Collection[] {
  const byName = new Map(packs.map((p) => [p.name.toLowerCase(), p.name]));
  const curated = (id: keyof typeof CURATED_COLLECTIONS) =>
    CURATED_COLLECTIONS[id].map((n) => byName.get(n.toLowerCase())).filter((n): n is string => !!n);
  return [
    { id: "bot-ui", title: "For bot interfaces", hint: "Clear icon sets for menus, buttons and statuses", packs: curated("bot-ui") },
    { id: "popular", title: "Popular", hint: "Well-known packs people use every day, across categories", packs: curated("popular") },
    { id: "animated", title: "Animated", hint: "Packs that move: faces, reactions and effects", packs: curated("animated") },
    { id: "adaptive", title: "Light and dark themes", hint: "Drawn in the text colour, like Telegram's own icons: they fit any chat theme",
      packs: curated("adaptive") },
  ].filter((c) => c.packs.length >= 3);
}

/** A short fingerprint of the catalog, so the search index rebuilds when anything in it changes. */
function revisionOf(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return `${text.length.toString(36)}-${(h >>> 0).toString(36)}`;
}

/** One listed pack with all its emoji, or null when it is not in the list or cannot be read. */
export async function getLibraryPack(name: string): Promise<{ pack: LibraryPack; emoji: LibraryEmoji[] } | null> {
  "use cache";
  cacheLife("hours");
  const list = listedPacks();
  const rank = list.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  if (rank < 0) return null;
  try {
    const { pack, emoji } = await readPack(list[rank], rank);
    return emoji.length ? { pack, emoji: emoji.map((e) => ({ ...e, search: emojiSearchText(e.fallback, e.tags) })) } : null;
  } catch (err) {
    // Only a definite answer is cached as "no page" (no such pack, not an emoji pack, no resolver token
    // in this deployment); a timeout or a 429 throws, so the
    // cache keeps the last good page instead of a 404 for hours.
    const code = (err as { code?: string })?.code;
    if (code === "PACK_NOT_FOUND" || code === "NOT_EMOJI_PACK" || code === "RESOLVER_OFF") return null;
    throw err;
  }
}
