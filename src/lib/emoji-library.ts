// The premium emoji library at /emoji: packs listed in src/content/emoji-packs.txt (one link per
// line, grouped under "## Category" lines, kept by hand), read through the resolver, with search
// text built on the server. Search covers the pack title, name and category, the tags in
// emoji-tags.txt, and the keywords of the ordinary emoji each custom emoji stands for (emojilib),
// so "cart" finds a custom 🛒.
import "server-only";
import { cacheLife } from "next/cache";
import packsText from "@/content/emoji-packs.txt";
import tagsText from "@/content/emoji-tags.txt";
import { fixturesOn } from "./emoji-fixtures";
import { PACK_NAME, resolvePack, type Format, type PackEmoji } from "./emoji-pack";
import { emojiSearchText, type SearchSource } from "./emoji-search";
import { slotEmoji } from "./emoji-slots";

const LINK = /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/addemoji\/([A-Za-z0-9_]{1,64})\/?(?:[?#].*)?$/i;
const SAMPLE = 16; // two rows of 8 on a pack card
export const OTHER = "Other";

export interface ListedPack { name: string; category: string }
export interface LibraryEmoji extends PackEmoji { tags: string[]; search: string }
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
  /** names of the most similar packs (same category, shared meanings) */
  similar: string[];
  tags: string[]; sample: LibraryEmoji[];
}
export interface Collection { id: string; title: string; hint: string; packs: string[] }
export interface Library {
  packs: LibraryPack[]; categories: string[]; collections: Collection[]; listed: number; unavailable: string[];
  /** everything the search engine needs; stays on the server */
  source: SearchSource;
}



const FIXTURE_PACKS: ListedPack[] = [
  { name: "bot_ui_demo_icons", category: "Interface" },
  { name: "bot_ui_demo_motion", category: "Animated marks" },
  { name: "bot_ui_demo_status", category: "Interface" },
];

/** Packs from the links file, in file order, without duplicates (case-insensitive). A line
 *  "## Category" puts the links below it in that category; links before any heading are "Other". */
export function parsePackList(text: string): ListedPack[] {
  const seen = new Set<string>();
  const out: ListedPack[] = [];
  let category = OTHER;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      category = line.slice(3).trim().slice(0, 40) || OTHER;
      continue;
    }
    if (!line || line.startsWith("#")) continue;
    const name = LINK.exec(line)?.[1] ?? line;
    if (!PACK_NAME.test(name) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, category });
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

/** The packs file, or the local stand-in packs while developing with EMOJI_RESOLVER_FIXTURES=1. */
function listed(): ListedPack[] {
  return fixturesOn() ? FIXTURE_PACKS : parsePackList(packsText);
}

function withSearch(pack: string, e: PackEmoji, tags: Map<string, string[]>): LibraryEmoji {
  const own = tags.get(`${pack.toLowerCase()}/${e.id}`) ?? [];
  return { ...e, tags: own, search: emojiSearchText(e.fallback, own) };
}

function coverage(fallbacks: Set<string>): string[] {
  return [...slotEmoji(fallbacks).keys()];
}

async function readPack({ name, category }: ListedPack, tags: Map<string, string[]>, rank = 0): Promise<{ pack: LibraryPack; emoji: LibraryEmoji[]; fallbacks: Set<string> }> {
  const p = await resolvePack(name);
  const emoji = p.emoji.map((e) => withSearch(p.name, e, tags));
  const packTags = tags.get(p.name.toLowerCase()) ?? [];
  const formats = (["static", "animated", "video"] as const).filter((f) => emoji.some((e) => e.format === f));
  const fallbacks = new Set(emoji.map((e) => strip(e.fallback)).filter(Boolean));
  return {
    emoji,
    fallbacks,
    pack: {
      name: p.name, title: p.title, link: `https://t.me/addemoji/${p.name}`, category, count: emoji.length, formats,
      rank, meanings: fallbacks.size, covers: coverage(fallbacks), similar: [],
      adaptive: emoji.some((e) => e.adaptive), adaptiveShare: emoji.length ? emoji.filter((e) => e.adaptive).length / emoji.length : 0, tags: packTags, sample: emoji.slice(0, SAMPLE).map((e) => ({ ...e, tags: [], search: "" })),
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

/** Every listed pack the resolver can read; the rest are reported, not shown. Categories keep
 *  the file's order, "Other" last. */
export async function getLibrary(): Promise<Library> {
  "use cache";
  cacheLife("hours");
  const list = listed();
  const tags = parseTags(tagsText);
  const results = await settledInBatches(list, READ_PARALLEL, (p, i) => readPack(p, tags, i));
  const read: { pack: LibraryPack; emoji: LibraryEmoji[]; fallbacks: Set<string> }[] = [];
  const unavailable: string[] = [];
  results.forEach((r, i) => (r.status === "fulfilled" ? read.push(r.value) : unavailable.push(list[i].name)));
  // A Telegram outage or a 429 pause mid-refresh must not be cached as a smaller library for hours:
  // throw, so the cache keeps the previous library. Without a resolver token at all (a build that
  // has none yet) every pack fails the same way; that renders as an empty library instead.
  const off = results.every((r) => r.status === "rejected" && (r.reason as { code?: string })?.code === "RESOLVER_OFF");
  if (!off && unavailable.length > list.length * 0.2) {
    throw new Error(`emoji library: ${unavailable.length} of ${list.length} packs could not be read; keeping the previous library`);
  }
  linkSimilar(read);
  const packs = read.map((r) => r.pack);
  const categories = [...new Set(packs.map((p) => p.category))].sort((a, b) => Number(a === OTHER) - Number(b === OTHER));
  const body = {
    packs: packs.map((p) => ({ name: p.name, title: p.title, category: p.category, rank: p.rank, tags: p.tags })),
    emoji: read.flatMap((r, p) => r.emoji.map((e) => ({ p, id: e.id, f: e.fallback, fmt: e.format, ad: e.adaptive, pv: !!e.preview, tags: e.tags }))),
  };
  const source: SearchSource = { ...body, revision: revisionOf(JSON.stringify(body)) };
  return { packs, categories, collections: collections(packs), listed: list.length, unavailable, source };
}

/** Similar packs: the same category counts most, then the share of meanings two packs have in common. */
function linkSimilar(read: { pack: LibraryPack; fallbacks: Set<string> }[]) {
  for (const a of read) {
    a.pack.similar = read
      .filter((b) => b !== a)
      .map((b) => {
        let shared = 0;
        for (const f of a.fallbacks) if (b.fallbacks.has(f)) shared++;
        const union = a.fallbacks.size + b.fallbacks.size - shared || 1;
        return { name: b.pack.name, score: (a.pack.category === b.pack.category ? 1 : 0) + shared / union };
      })
      .filter((x) => x.score > 0.15)
      .sort((x, y) => y.score - x.score)
      .slice(0, 6)
      .map((x) => x.name);
  }
}

/** Curated rows for the library's first screen, built from what the packs contain. */
function collections(packs: LibraryPack[]): Collection[] {
  const byRank = [...packs].sort((a, b) => a.rank - b.rank);
  const pick = (list: LibraryPack[]) => list.slice(0, 12).map((p) => p.name);
  // The file is grouped by category, most popular first inside each: take the top of every
  // category in turn, so the Popular row is varied.
  const groups = [...new Set(byRank.map((p) => p.category))].map((c) => byRank.filter((p) => p.category === c));
  const popular: LibraryPack[] = [];
  for (let i = 0; popular.length < byRank.length; i++) {
    for (const g of groups) if (g[i]) popular.push(g[i]);
  }
  return [
    { id: "bot-ui", title: "For bot interfaces", hint: "Most of the meanings a bot needs: home, back, done, cart, settings…",
      packs: pick([...packs].filter((p) => p.covers.length >= 6).sort((a, b) => b.covers.length - a.covers.length || a.rank - b.rank)) },
    { id: "popular", title: "Popular", hint: "The packs people share most, across categories", packs: pick(popular) },
    { id: "animated", title: "Animated", hint: "Packs that move", packs: pick(popular.filter((p) => p.formats.some((f) => f !== "static"))) },
    { id: "adaptive", title: "Light and dark themes", hint: "Drawn in the text colour, like Telegram's own icons: they fit any chat theme",
      packs: popular.filter((p) => p.adaptiveShare >= 0.5).map((p) => p.name) },
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
  const list = listed();
  const rank = list.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  if (rank < 0) return null;
  try {
    const { pack, emoji } = await readPack(list[rank], parseTags(tagsText), rank);
    const library = await getLibrary();
    const same = library.packs.find((p) => p.name === pack.name);
    return { pack: { ...pack, similar: same?.similar ?? [] }, emoji };
  } catch (err) {
    // Only a definite answer from Telegram is cached as "no page"; a timeout or a 429 throws, so the
    // cache keeps the last good page instead of a 404 for hours.
    const code = (err as { code?: string })?.code;
    if (code === "PACK_NOT_FOUND" || code === "NOT_EMOJI_PACK") return null;
    throw err;
  }
}

export async function listedPackNames(): Promise<string[]> {
  return listed().map((p) => p.name);
}
