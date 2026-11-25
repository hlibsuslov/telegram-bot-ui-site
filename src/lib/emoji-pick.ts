// Choosing packs for a bot: rank the catalog's packs by faceted tags (style, colour, mood, topic,
// bot category...), and pick ONE family that covers the bot's icon slots. The same rules as the
// telegram-bot-ui skill's local tools (scripts/emoji_packs.py: rank_by_facets, pick_family), run over
// the whole catalog here instead of a few searched candidates, since the server holds every pack.
import "server-only";
import { allPackFacets, catalogVersion, facetValueId, taxonomy, type FacetMap } from "./emoji-facets";
import { telegramPackUrl } from "./emoji-links";
import type { SearchEmoji, SearchSource } from "./emoji-search";
import { slotEmoji, stripVariation } from "./emoji-slots";

/** Wanted tags by facet; values are ids or English/Russian labels. */
export type Brief = Partial<Record<string, string[]>>;
export type Theme = "both" | "light" | "dark";
export type Motion = "static" | "any";

/** How much each facet counts when a pack is matched to a brief (normalised over the facets given). */
const FACET_WEIGHT: Record<string, number> = { style: 0.28, topic: 0.2, use: 0.14, fit: 0.12, color: 0.1, mood: 0.1, palette: 0.04, motion: 0.02 };
const OTHER_FACET_WEIGHT = 0.05;

/** A key's own value: facet names come from callers, and "constructor" or "toString" must not reach Object.prototype. */
const own = <T>(record: Record<string, T>, key: string): T | undefined => (Object.hasOwn(record, key) ? record[key] : undefined);

/** Brief values as taxonomy ids, and what could not be read. */
function normalizeBrief(brief: Brief): { wanted: Record<string, string[]>; problems: string[] } {
  const wanted: Record<string, string[]> = {};
  const problems: string[] = [];
  for (const [facet, values] of Object.entries(brief)) {
    if (!values?.length) continue;
    const def = own(taxonomy.facets, facet);
    if (!def) { problems.push(`unknown facet ${facet} (known: ${Object.keys(taxonomy.facets).join(", ")})`); continue; }
    const ids: string[] = [];
    for (const v of values) {
      const id = facetValueId(facet, v);
      if (!id) problems.push(`${facet}:${v} is not in the taxonomy (known: ${Object.keys(def.values).join(", ")})`);
      else if (!ids.includes(id)) ids.push(id);
    }
    if (ids.length) wanted[facet] = ids;
  }
  return { wanted, problems };
}

type Matched = [facet: string, value: string, confidence: number];

/** 0..1: how well one pack's tags fit the brief, and the tags that matched. A facet counts by the best
 *  confidence of a wanted value; tags below the pack threshold count for nothing; an adaptive theme
 *  fit also serves light and dark. */
function facetMatch(tags: FacetMap, wanted: Record<string, string[]>, threshold: number): { score: number; matched: Matched[] } {
  let got = 0, total = 0;
  const matched: Matched[] = [];
  for (const [facet, values] of Object.entries(wanted)) {
    const weight = own(FACET_WEIGHT, facet) ?? OTHER_FACET_WEIGHT;
    total += weight;
    let best = 0, hit: Matched | null = null;
    for (const [value, conf] of own(tags, facet) ?? []) {
      if (conf < threshold || conf <= best) continue;
      const themeFit = facet === "fit" && (value === "adaptive" || value === "both") && values.some((v) => ["light", "dark", "both"].includes(v));
      if (values.includes(value) || themeFit) { best = conf; hit = [facet, value, Math.round(conf * 100) / 100]; }
    }
    if (hit) { got += weight * best; matched.push(hit); }
  }
  return { score: total ? got / total : 0, matched };
}

export interface RankOptions { brief?: Brief; require?: string[]; motion?: Motion; theme?: Theme; top?: number }

/** Catalog packs ordered by how well their tags fit a brief. `require` ("facet:value") are hard filters:
 *  the pack must carry the tag at or above the pack threshold. Motion and theme are preferences. */
export function rankPacks({ brief = {}, require = [], motion, theme, top = 8 }: RankOptions) {
  const th = taxonomy.thresholds.pack;
  const { wanted, problems } = normalizeBrief(brief);
  const must: [string, string][] = require.map((r) => {
    const at = r.indexOf(":");
    const [facet, value] = at < 0 ? [r, ""] : [r.slice(0, at), r.slice(at + 1)];
    const id = own(taxonomy.facets, facet) ? facetValueId(facet, value) : undefined;
    if (!id) problems.push(`bad filter ${r}`);
    return [facet, id ?? ""];
  });
  // A filter that names nothing real matches no pack, never every pack.
  const packs = must.every(([, v]) => v) ? allPackFacets() : [];
  const rows = [];
  for (const pk of packs) {
    const tags = pk.facets;
    if (must.some(([f, v]) => !(own(tags, f) ?? []).some(([val, c]) => val === v && c >= th))) continue;
    const { score: match, matched } = facetMatch(tags, wanted, th);
    let score = match;
    // Preferences, not filters: Telegram's own icon packs are animated, and dropping them would hide
    // the best toolbar sets. require motion:static when it must be static.
    const moving = Math.max(0, ...(tags.motion ?? []).filter(([v]) => v === "animated" || v === "video").map(([, c]) => c));
    if (motion === "static" && moving >= th) score -= 0.1 * moving;
    const fit = Object.fromEntries(tags.fit ?? []);
    const themeSafe = Math.max(fit.adaptive ?? 0, fit.both ?? 0, theme === "light" || theme === "dark" ? fit[theme] ?? 0 : 0);
    if (theme) score += 0.1 * themeSafe;
    rows.push({ name: pk.name, category: pk.category, score: Math.round(score * 1000) / 1000, matched, compatible: pk.compatible.slice(0, 4).map(([n]) => n) });
  }
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return {
    ok: true as const, ...catalogVersion, brief: wanted, require: must.map(([f, v]) => `${f}:${v}`), problems,
    total: rows.length, packs: rows.slice(0, top),
  };
}

export interface FamilyOptions extends RankOptions { slots: string[] }

interface Icon { id: string; set: string; fallback: string; animated: boolean; adaptive: boolean }

/** ONE pack for the slots a bot needs and its icon map. Score = slot coverage, then fit to the brief,
 *  then theme safety (adaptive share when both themes matter), then static icons (buttons), then one
 *  format across the pack. The slots and their emoji are lib/emoji-slots.ts. */
export function pickFamily(source: SearchSource, { slots, brief = {}, require = [], motion = "static", theme = "both", top = 6 }: FamilyOptions) {
  const fit = new Map<string, { score: number; matched: Matched[] }>();
  let wanted: Record<string, string[]> = {};
  const notes: string[] = [];
  const hasBrief = Object.values(brief).some((v) => v?.length);
  if (hasBrief || require.length) {
    // The theme the bot must look right in is part of the brief.
    const ask: Brief = hasBrief && !brief.fit?.length ? { ...brief, fit: [theme] } : brief;
    const ranked = rankPacks({ brief: ask, require, top: Infinity });
    wanted = ranked.brief;
    notes.push(...ranked.problems);
    for (const r of ranked.packs) fit.set(r.name, { score: r.score, matched: r.matched });
    if (require.length && !fit.size) notes.push("no pack carries every required tag");
  }
  const hasWanted = Object.keys(wanted).length > 0;
  if (!source.packs.length) notes.push("the library could not be read in this deployment");

  const emojiOf = new Map<number, SearchEmoji[]>();
  for (const e of source.emoji) {
    const list = emojiOf.get(e.p);
    if (list) list.push(e); else emojiOf.set(e.p, [e]);
  }

  const ranking = [];
  for (const [p, emoji] of emojiOf) {
    const { name, title } = source.packs[p];
    if (require.length && !fit.has(name)) continue;
    const byFallback = new Map<string, SearchEmoji>();
    for (const e of emoji) {
      const key = stripVariation(e.f);
      if (key && !byFallback.has(key)) byFallback.set(key, e);
    }
    const signs = slotEmoji(byFallback.keys());
    const icons: Record<string, Icon> = {};
    const missing: string[] = [];
    for (const slot of slots) {
      const e = byFallback.get(stripVariation(signs.get(slot) ?? ""));
      if (!e) { missing.push(slot); continue; }
      icons[slot] = { id: e.id, set: name, fallback: e.f, animated: e.fmt !== "static", adaptive: e.ad };
    }
    const used = Object.values(icons);
    if (!used.length) continue;
    const coverage = used.length / slots.length;
    const adaptive = used.filter((i) => i.adaptive).length / used.length;
    const still = used.filter((i) => !i.animated).length / used.length;
    const formats: Record<string, number> = {};
    for (const e of emoji) formats[e.fmt] = (formats[e.fmt] ?? 0) + 1;
    const match = fit.get(name) ?? { score: 0, matched: [] };
    let score = coverage;
    if (hasWanted) score += 0.35 * match.score;
    if (theme === "both") score += 0.15 * adaptive;
    if (motion === "static") score += 0.1 * still;
    score += 0.05 * Math.max(...Object.values(formats)) / emoji.length;
    ranking.push({ icons, row: {
      name, title, telegramUrl: telegramPackUrl(name), coverage: Math.round(coverage * 1000) / 1000,
      adaptiveShare: Math.round(adaptive * 100) / 100, staticShare: Math.round(still * 100) / 100, formats, missing,
      score: Math.round(score * 1000) / 1000,
      ...(hasWanted ? { briefMatch: Math.round(match.score * 100) / 100, matched: match.matched } : {}),
    } });
  }
  ranking.sort((a, b) => b.row.score - a.row.score || a.row.name.localeCompare(b.row.name));
  const best = ranking[0];
  return {
    ok: true as const, ...catalogVersion, slots,
    ranking: ranking.slice(0, top).map(({ row }) => row),
    map: best ? { family: best.row.name, title: best.row.title, telegramUrl: best.row.telegramUrl, icons: best.icons, missing: best.row.missing } : null,
    ...(hasWanted ? { brief: wanted } : {}),
    ...(notes.length ? { notes } : {}),
  };
}
