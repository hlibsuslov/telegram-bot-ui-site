// Faceted tags of the emoji library (scripts/emoji_taxonomy.py builds src/content/emoji-facets.json
// from Telegram data, contact-sheet pixels, the free-text tags and src/content/emoji-tag-overrides.txt).
// Every tag has a confidence; search and filters use tags at or above the taxonomy's thresholds.
//
// Query syntax: `facet:value` filters, e.g. `settings style:outline fit:adaptive motion:static`, or
// `use:shop color:blue`. A value may be its id or its English/Russian label word ("контурный").
import "server-only";
import facetsDoc from "@/content/emoji-facets.json";
import taxonomyDoc from "@/content/emoji-taxonomy.json";

export type Tag = [string, number];
export type FacetMap = Record<string, Tag[]>;
/** How a pack is drawn (look cards in emoji-pack-styles.json). */
export interface Look { line_weight: string; fill: string; perspective: string; shadows: string; characters: string; drawn: string }
/** What a pack shows, what a bot uses it for and what not, per language. Not every build has it yet. */
export type PackDescription = Partial<Record<"en" | "ru" | "uk", { what: string; for: string; not_for: string }>>;
interface PackDoc {
  category: string; count: number; meanings: number; facets: FacetMap; compatible: [string, number][];
  title?: string; look?: Look; description?: PackDescription;
}
interface FacetsDoc {
  format: string; taxonomy: number; generated: string; thresholds: { emoji: number; pack: number; show: number };
  packs: Record<string, PackDoc>;
  /** per emoji: "c:blue@9,white@6;s:outline@6" (facet code, value, confidence x10) */
  codes: Record<string, string>; emoji: Record<string, Record<string, string>>;
}
interface ValueDef { en: string; ru: string; aliases?: string[] }
interface FacetDef { label: { en: string; ru: string }; measured?: boolean; scope: string[]; values: Record<string, ValueDef> }
export interface Taxonomy { version: number; facets: Record<string, FacetDef>; thresholds: { emoji: number; pack: number; show: number } }

const doc = facetsDoc as unknown as FacetsDoc;
export const taxonomy = taxonomyDoc as unknown as Taxonomy;
const byLowerPack = new Map(Object.keys(doc.packs).map((k) => [k.toLowerCase(), k]));

/** look and description only when the catalog has them, so a response never carries an empty one. */
function drawnAs(p: PackDoc): { look?: Look; description?: PackDescription } {
  return { ...(p.look && { look: p.look }), ...(p.description && { description: p.description }) };
}

export function packFacets(name: string): { facets: FacetMap; compatible: [string, number][]; look?: Look; description?: PackDescription } | null {
  const key = byLowerPack.get(name.toLowerCase());
  if (!key) return null;
  return { facets: doc.packs[key].facets, compatible: doc.packs[key].compatible ?? [], ...drawnAs(doc.packs[key]) };
}

const facetOfCode = Object.fromEntries(Object.entries(doc.codes).map(([facet, code]) => [code, facet]));

function decode(text: string): FacetMap {
  const out: FacetMap = {};
  for (const part of text ? text.split(";") : []) {
    const facet = facetOfCode[part.slice(0, part.indexOf(":"))];
    if (!facet) continue;
    out[facet] = part.slice(part.indexOf(":") + 1).split(",").map((v) => {
      const at = v.lastIndexOf("@");
      return [v.slice(0, at), Number(v.slice(at + 1)) / 10] as Tag;
    });
  }
  return out;
}

/** One emoji's tags; style and topic it has no own tag for come from its pack (a pack is drawn in one hand). */
export function emojiFacets(pack: string, id: string): FacetMap {
  const key = byLowerPack.get(pack.toLowerCase());
  if (!key) return {};
  const own = decode(doc.emoji[key]?.[id] ?? "");
  const packMap = doc.packs[key].facets;
  for (const facet of ["style", "topic"]) {
    if (!own[facet] && packMap[facet]) own[facet] = packMap[facet].filter(([, c]) => c >= 0.5).map(([v, c]) => [v, Math.round(c * 8) / 10] as Tag);
  }
  return own;
}

/** "facet:value" tokens of tags at or above `min`, for filtering. */
export function facetTokens(map: FacetMap, min: number): string[] {
  const out: string[] = [];
  for (const [facet, tags] of Object.entries(map)) for (const [v, c] of tags) if (c >= min) out.push(`${facet}:${v}`);
  return out;
}

/** Label words of the tags (English and Russian), so "outline" or "контурный" finds them without the syntax. */
export function facetWords(map: FacetMap, min: number): string[] {
  const out: string[] = [];
  for (const [facet, tags] of Object.entries(map)) {
    const def = taxonomy.facets[facet];
    if (!def || facet === "meaning") continue;
    for (const [v, c] of tags) {
      const val = def.values[v];
      if (val && c >= min) out.push(val.en, val.ru);
    }
  }
  return out;
}

const VALUE_INDEX = (() => {
  const m = new Map<string, string>(); // "facet:word" -> value id
  for (const [facet, def] of Object.entries(taxonomy.facets)) {
    for (const [id, v] of Object.entries(def.values)) {
      for (const w of [id, v.en, v.ru, ...(v.aliases ?? [])]) m.set(`${facet}:${w.toLowerCase().replace(/ё/g, "е")}`, id);
    }
  }
  return m;
})();

/** Splits `facet:value` filters from the words of a query. Unknown facets or values are kept as words. */
export function parseFilters(query: string): { filters: string[]; rest: string; unknown: string[] } {
  const filters: string[] = [];
  const unknown: string[] = [];
  const rest = query.replace(/(?:^|\s)([a-z]+):([^\s]+)/giu, (whole, facet: string, raw: string) => {
    const f = facet.toLowerCase();
    if (f === "meaning") { filters.push(`meaning:${raw.toLowerCase()}`); return " "; }
    const id = VALUE_INDEX.get(`${f}:${raw.toLowerCase().replace(/ё/g, "е")}`);
    if (id) { filters.push(`${f}:${id}`); return " "; }
    if (taxonomy.facets[f]) { unknown.push(`${f}:${raw}`); return " "; }
    return whole;
  });
  return { filters, rest: rest.trim(), unknown };
}

/** Tags worth showing: confident enough, with their labels, grouped by facet in taxonomy order. */
export function labelled(map: FacetMap, lang: "en" | "ru" = "en"): { facet: string; label: string; values: { id: string; label: string; confidence: number }[] }[] {
  const out = [];
  for (const [facet, def] of Object.entries(taxonomy.facets)) {
    const tags = (map[facet] ?? []).filter(([, c]) => c >= taxonomy.thresholds.show);
    if (tags.length) out.push({ facet, label: def.label[lang], values: tags.map(([id, c]) => ({ id, label: def.values[id]?.[lang] ?? id, confidence: c })) });
  }
  return out;
}

export const facetsMeta = { generated: doc.generated, taxonomy: doc.taxonomy, thresholds: doc.thresholds };
/** The catalog version every JSON answer carries: taxonomy version and the day the tags were built. */
export const catalogVersion = { taxonomy: doc.taxonomy, generated: doc.generated };
/** Facet of each one-letter code in the per-emoji tag strings ("c" -> "color"). */
export const facetCodes: Record<string, string> = facetOfCode;

/** Every pack's facets in one answer, for agents that pick packs (GET /api/emoji-facets). */
export function allPackFacets() {
  return Object.entries(doc.packs).map(([name, p]) => ({
    name, category: p.category, count: p.count, meanings: p.meanings, facets: p.facets, compatible: p.compatible ?? [], ...drawnAs(p),
  }));
}

export interface CatalogPack {
  name: string; title: string | null; category: string; count: number; meanings: number; facets: FacetMap;
  look?: Look; description?: PackDescription; compatible: [string, number][];
  /** every emoji id with its own tag string ("c:blue@9,white@6;s:outline@6") */
  emoji: { id: string; codes: string }[];
}
let catalog: CatalogPack[] | null = null;

/** Every pack with its emoji ids and their raw tag strings, for the catalog export (lib/emoji-export.ts). */
export function catalogPacks(): CatalogPack[] {
  catalog ??= Object.entries(doc.packs).map(([name, p]) => ({
    name, title: p.title ?? null, category: p.category, count: p.count, meanings: p.meanings, facets: p.facets,
    ...drawnAs(p), compatible: p.compatible ?? [],
    emoji: Object.entries(doc.emoji[name] ?? {}).map(([id, codes]) => ({ id, codes })),
  }));
  return catalog;
}
