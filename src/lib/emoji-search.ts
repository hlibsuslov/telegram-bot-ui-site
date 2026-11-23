// Search over every emoji of the library: what each emoji shows, in words.
//
// Where the words come from (weight in brackets):
//  * tags in emoji-tags.txt: what the picture shows, written by hand or by a vision model (5);
//    Telegram keeps creators' keywords to itself, so this is the only way "nvidia" finds a logo
//  * the ordinary emoji each custom emoji stands for, in words: English (emojilib), Russian and
//    Ukrainian (emojibase labels and tags) (2)
//  * the pack: title, name, category and pack tags, shared by all its emoji (1, and they rank the pack)
//
// How a query is matched: words are lower-cased, "ё" -> "е", and reduced to a rough stem (Russian
// and Ukrainian endings, English plural "s"), so "кошки" finds "кошка". A query word matches a
// term exactly (x1), as its start (x0.7, from 2 letters) or with one typo (x0.4, from 4 letters).
// An emoji in the query matches emoji that stand for it. Every query word must match something about
// the emoji or its pack. Packs rank by their own words, then their best emoji, then popularity.
// Suggestions: completions of the last word (by how many emoji carry them), tags that come up most
// in the results ("logo" -> "nvidia", "apple"), matching categories, and "did you mean" on no result.
import "server-only";
import emojilib from "emojilib";
import ruData from "emojibase-data/ru/compact.json";
import ukData from "emojibase-data/uk/compact.json";
import type { Format } from "./emoji-pack";
import { stripVariation } from "./emoji-slots";

export interface SearchPack { name: string; title: string; category: string; rank: number; tags: string[] }
/** pv: the emoji has a preview picture (an animated emoji without a thumbnail has none) */
export interface SearchEmoji { p: number; id: string; f: string; fmt: Format; ad: boolean; pv: boolean; tags: string[] }
/** revision: a fingerprint of the whole catalog; the search index is rebuilt when it changes */
export interface SearchSource { packs: SearchPack[]; emoji: SearchEmoji[]; revision: string }

export interface EmojiHit {
  pack: string; id: string; fallback: string; format: Format; adaptive: boolean;
  preview: string | null; animation: string | null; score: number;
}
export interface SearchResult {
  query: string;
  emoji: EmojiHit[];
  packs: { name: string; score: number; hits: number }[];
  suggest: { complete: string[]; related: string[]; categories: string[]; didYouMean: string | null };
  total: number;
}

// ------------------------------------------------------------------ words

const RU_ENDINGS = ["иями", "ями", "ами", "ого", "его", "ому", "ему", "ыми", "ими", "ых", "их", "ой", "ей", "ий", "ый", "ая", "яя",
  "ое", "ее", "ые", "ие", "ов", "ев", "ам", "ям", "ах", "ях", "ом", "ем", "ую", "юю", "а", "я", "ы", "и", "у", "ю", "е", "о", "ь", "й", "і", "ї"];
const CYR = /[а-яёіїєґ]/;

/** A rough stem: enough to make "кошки"/"кошка" and "logos"/"logo" meet; not a linguist. */
export function stem(word: string): string {
  if (CYR.test(word)) {
    if (word.length < 5) return word;
    for (const e of RU_ENDINGS) if (word.endsWith(e) && word.length - e.length >= 3) return word.slice(0, -e.length);
    return word;
  }
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

const WORD = /[\p{L}\p{N}]+/gu;
/** Lower-cased words. Single letters and digits are kept only where they carry meaning (tags like
 *  "letter a" and queries); dictionaries drop them, or prepositions like "в" would match everything. */
export function words(text: string, singles = false): string[] {
  return (text.toLowerCase().replace(/ё/g, "е").match(WORD) ?? []).filter((w) => singles || w.length > 1 || /\d/.test(w));
}

const EMOJI_RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*|\p{Regional_Indicator}{2}/gu;

type Weighted = [string, number];
const meaningWords = new Map<string, string[]>();
function addMeaning(emoji: string, list: string[]) {
  const key = stripVariation(emoji);
  meaningWords.set(key, [...(meaningWords.get(key) ?? []), ...list]);
}
for (const [e, list] of Object.entries(emojilib as Record<string, string[]>)) addMeaning(e, list.flatMap((w) => words(w.replace(/_/g, " "))));
for (const data of [ruData, ukData] as { unicode: string; label?: string; tags?: string[] }[][]) {
  for (const d of data) addMeaning(d.unicode, [...words(d.label ?? ""), ...(d.tags ?? []).flatMap((t) => words(t))]);
}

/** Words for what an ordinary emoji means, in English, Russian and Ukrainian. */
export function meaningOf(fallback: string): string[] {
  return [...new Set(meaningWords.get(stripVariation(fallback)) ?? [])];
}

/** One search string per emoji for the pack page's instant filter (raw words, not stems). */
export function emojiSearchText(fallback: string, tags: string[]): string {
  return [fallback, ...tags, ...meaningOf(fallback)].join(" ").toLowerCase();
}

// ------------------------------------------------------------------ index

type Index = {
  src: SearchSource;
  emojiTerms: Map<string, Map<number, number>>;   // stem -> emoji index -> weight
  packTerms: Map<string, Map<number, number>>;    // stem -> pack index -> weight
  byFallback: Map<string, number[]>;
  surface: Map<string, { word: string; n: number }>; // stem -> commonest whole word, how many emoji carry it
  stems: string[];
  tagStems: Map<number, string[]>;                // emoji index -> stems of its own tags
};

let cached: { key: string; index: Index } | null = null;

function put(map: Map<string, Map<number, number>>, key: string, at: number, w: number) {
  let m = map.get(key);
  if (!m) map.set(key, (m = new Map()));
  if ((m.get(at) ?? 0) < w) m.set(at, w);
}

function build(src: SearchSource): Index {
  const emojiTerms = new Map<string, Map<number, number>>();
  const packTerms = new Map<string, Map<number, number>>();
  const byFallback = new Map<string, number[]>();
  const surface = new Map<string, { word: string; n: number }>();
  const tagStems = new Map<number, string[]>();
  const meaningCache = new Map<string, Weighted[]>();
  const count = (word: string) => {
    const s = stem(word);
    const cur = surface.get(s);
    if (!cur) surface.set(s, { word, n: 1 });
    else { cur.n++; if (word.length < cur.word.length) cur.word = word; }
  };

  src.packs.forEach((p, i) => {
    for (const w of words(p.title)) put(packTerms, stem(w), i, 3);
    for (const w of words(p.name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " "))) put(packTerms, stem(w), i, 2);
    for (const w of words(p.category)) put(packTerms, stem(w), i, 3);
    for (const t of p.tags) for (const w of words(t)) put(packTerms, stem(w), i, 4);
  });

  src.emoji.forEach((e, i) => {
    const f = stripVariation(e.f);
    if (f) byFallback.set(f, [...(byFallback.get(f) ?? []), i]);
    let meaning = meaningCache.get(f);
    if (!meaning) {
      meaning = meaningOf(f).map((w) => [w, 2] as Weighted);
      meaningCache.set(f, meaning);
    }
    const own = e.tags.flatMap((t) => words(t, true));
    tagStems.set(i, own.map(stem));
    for (const w of own) { put(emojiTerms, stem(w), i, 5); count(w); }
    for (const [w, weight] of meaning) { put(emojiTerms, stem(w), i, weight); count(w); }
  });
  return { src, emojiTerms, packTerms, byFallback, surface, stems: [...new Set([...emojiTerms.keys(), ...packTerms.keys()])], tagStems };
}

function indexOf(src: SearchSource): Index {
  if (cached?.key !== src.revision) cached = { key: src.revision, index: build(src) };
  return cached.index;
}

/** Edit distance with an early exit past `max`. */
export function distance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      low = Math.min(low, cur[j]);
    }
    if (low > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Stems a query word matches, with how well: exact 1, start 0.7; only when neither exists, one
 *  typo 0.4 (from 4 letters), so "binance" stays a brand and does not turn into "finance". */
function expand(ix: Index, q: string): [string, number][] {
  const s = stem(q);
  const out: [string, number][] = [];
  for (const t of ix.stems) {
    if (t === s) out.push([t, 1]);
    else if (s.length >= 2 && t.startsWith(s)) out.push([t, 0.7]);
  }
  if (out.length || s.length < 4) return out;
  for (const t of ix.stems) if (distance(s, t, 1) <= 1) out.push([t, 0.4]);
  return out;
}

// ------------------------------------------------------------------ search

export function search(src: SearchSource, query: string, { limit = 60, pack }: { limit?: number; pack?: string } = {}): SearchResult {
  const ix = indexOf(src);
  const q = query.trim().slice(0, 100);
  const emojiInQuery = [...new Set((q.match(EMOJI_RE) ?? []).map(stripVariation))];
  const qWords = words(q.replace(EMOJI_RE, " "), true).slice(0, 6);
  const onlyPack = pack ? src.packs.findIndex((p) => p.name.toLowerCase() === pack.toLowerCase()) : -1;
  const empty: SearchResult = { query: q, emoji: [], packs: [], suggest: { complete: [], related: [], categories: [], didYouMean: null }, total: 0 };
  if (!qWords.length && !emojiInQuery.length) return empty;
  if (pack && onlyPack < 0) return empty; // an unknown pack filter means nothing, not everything

  // Score of each query part, per emoji and per pack.
  const parts: { emoji: Map<number, number>; packs: Map<number, number> }[] = [];
  for (const w of qWords) {
    const emoji = new Map<number, number>();
    const packs = new Map<number, number>();
    for (const [t, how] of expand(ix, w)) {
      for (const [i, weight] of ix.emojiTerms.get(t) ?? []) emoji.set(i, Math.max(emoji.get(i) ?? 0, weight * how));
      for (const [i, weight] of ix.packTerms.get(t) ?? []) packs.set(i, Math.max(packs.get(i) ?? 0, weight * how));
    }
    parts.push({ emoji, packs });
  }
  for (const e of emojiInQuery) {
    const emoji = new Map<number, number>();
    for (const i of ix.byFallback.get(e) ?? []) emoji.set(i, 5);
    parts.push({ emoji, packs: new Map() });
  }

  const phrase = qWords.length > 1 ? qWords.join(" ") : "";
  // An emoji matches when every part matches it or its pack.
  const scores = new Map<number, number>();
  src.emoji.forEach((e, i) => {
    if (onlyPack >= 0 && e.p !== onlyPack) return;
    let total = 0;
    for (const part of parts) {
      const s = Math.max(part.emoji.get(i) ?? 0, (part.packs.get(e.p) ?? 0) * 0.35);
      if (!s) return;
      total += s;
    }
    // The whole phrase inside one tag ("letter a") beats its words found apart.
    if (phrase && e.tags.some((t) => t.includes(phrase))) total += 3;
    scores.set(i, total);
  });

  const rankOf = (i: number) => src.packs[src.emoji[i].p].rank;
  const ordered = [...scores.entries()].sort((a, b) => b[1] - a[1] || rankOf(a[0]) - rankOf(b[0]));

  // Packs: their own words count most, then their three best emoji, then popularity.
  const packScore = new Map<number, { best: number[]; hits: number }>();
  for (const [i, s] of ordered) {
    const p = src.emoji[i].p;
    const cur = packScore.get(p) ?? { best: [], hits: 0 };
    cur.hits++;
    if (cur.best.length < 3) cur.best.push(s);
    packScore.set(p, cur);
  }
  const packs = [...packScore.entries()].map(([p, { best, hits }]) => {
    const own = parts.reduce((n, part) => n + (part.packs.get(p) ?? 0), 0);
    const score = own * 2 + best.reduce((a, b) => a + b, 0) / 3 + Math.min(hits, 20) / 20 + 1 / (1 + src.packs[p].rank / 50);
    return { name: src.packs[p].name, score: Math.round(score * 100) / 100, hits };
  }).sort((a, b) => b.score - a.score);

  const emoji = ordered.slice(0, limit).map(([i, score]) => {
    const e = src.emoji[i];
    const name = src.packs[e.p].name;
    return {
      pack: name, id: e.id, fallback: e.f, format: e.fmt, adaptive: e.ad, score: Math.round(score * 100) / 100,
      preview: e.pv ? `/api/emoji-pack/${name}/${e.id}` : null, animation: e.fmt === "animated" ? `/api/emoji-pack/${name}/${e.id}/anim` : null,
    };
  });

  // Suggestions.
  const qStems = new Set(qWords.map(stem));
  const last = qWords.at(-1);
  const complete = last
    ? [...ix.surface.entries()]
      .filter(([s, v]) => s !== stem(last) && v.word.startsWith(last) && !qStems.has(s))
      .sort((a, b) => b[1].n - a[1].n).slice(0, 6)
      .map(([, v]) => [...qWords.slice(0, -1), v.word].join(" "))
    : [];
  const relatedCount = new Map<string, number>();
  for (const [i] of ordered.slice(0, 300)) {
    for (const s of new Set(ix.tagStems.get(i) ?? [])) if (!qStems.has(s)) relatedCount.set(s, (relatedCount.get(s) ?? 0) + 1);
  }
  const related = [...relatedCount.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([s]) => ix.surface.get(s)?.word ?? s);
  const categories = [...new Set(src.packs.map((p) => p.category))]
    .filter((c) => qWords.some((w) => words(c).some((cw) => stem(cw).startsWith(stem(w)))));
  let didYouMean: string | null = null;
  if (!ordered.length && qWords.length) {
    const fixed = qWords.map((w) => {
      let best: { word: string; d: number; n: number } | null = null;
      for (const [s, v] of ix.surface) {
        const d = distance(stem(w), s, 2);
        if (d <= 2 && (!best || d < best.d || (d === best.d && v.n > best.n))) best = { word: v.word, d, n: v.n };
      }
      return best?.word ?? w;
    });
    if (fixed.join(" ") !== qWords.join(" ")) didYouMean = fixed.join(" ");
  }

  return { query: q, emoji, packs, suggest: { complete, related, categories, didYouMean }, total: ordered.length };
}
