// The JSON answers of the emoji library API, built once for both doors: the HTTP routes
// (src/app/api/emoji-*) and the MCP tools (lib/emoji-mcp.ts) return these objects as they are, so
// the same input gives the same answer either way. Rate limits stay with each door.
import "server-only";
import { getLibrary } from "./emoji-library";
import { emojiPackPath, telegramPackUrl } from "./emoji-links";
import { parseIds, resolvePack, resolveSets } from "./emoji-pack";
import { listedPackName } from "./emoji-pack-list";
import { search } from "./emoji-search";
import { allPackFacets, catalogVersion, emojiFacets, facetsMeta, packFacets, taxonomy } from "./emoji-facets";

/** GET /api/emoji-search: emoji and packs ranked for the words, emoji and facet:value filters of `q`. */
export async function searchAnswer(rawQuery: string, pack?: string) {
  const q = rawQuery.slice(0, 160);
  // An empty query answers at once: it must not wake the whole catalog up.
  if (!q.trim()) return { ok: true as const, ...catalogVersion, ...search({ packs: [], emoji: [], revision: "" }, "") };
  const library = await getLibrary();
  const result = search(library.source, q, { pack, limit: pack ? 200 : 60 });
  return {
    ok: true as const,
    ...catalogVersion,
    ...result,
    emoji: result.emoji.map((hit) => ({ ...hit, facets: emojiFacets(hit.pack, hit.id), pageUrl: emojiPackPath(hit.pack, hit.id) })),
    packs: result.packs.map((hit) => ({ ...hit, facets: packFacets(hit.name)?.facets ?? {}, pageUrl: emojiPackPath(hit.name) })),
  };
}

/** GET /api/emoji-pack/<name>: the pack's emoji from Telegram, with the catalog's tags, look and compatible packs. */
export async function packAnswer(name: string) {
  const pack = await resolvePack(name);
  const pageUrl = pack.emoji.length && listedPackName(pack.name) ? emojiPackPath(pack.name) : null;
  const pf = packFacets(pack.name);
  const emoji = pf ? pack.emoji.map((e) => ({ ...e, facets: emojiFacets(pack.name, e.id) })) : pack.emoji;
  return {
    ok: true as const, ...catalogVersion, ...pack, emoji, facets: pf?.facets ?? null, compatible: pf?.compatible ?? [],
    ...(pf?.look && { look: pf.look }), ...(pf?.description && { description: pf.description }),
    pageUrl, telegramUrl: telegramPackUrl(pack.name),
  };
}

/** GET /api/emoji-facets: the taxonomy, the confidence thresholds and every catalog pack's tags. */
export function facetsAnswer() {
  const facets = Object.fromEntries(Object.entries(taxonomy.facets).map(([id, f]) => [id, {
    label: f.label, measured: !!f.measured, scope: f.scope,
    values: Object.fromEntries(Object.entries(f.values).map(([v, d]) => [v, { en: d.en, ru: d.ru }])),
  }]));
  return { ok: true as const, ...facetsMeta, taxonomy: { version: taxonomy.version, facets }, packs: allPackFacets() };
}

/** GET /api/emoji-pack/by-id?ids=1,2,3: the pack of each custom emoji id Telegram knows. */
export async function byIdAnswer(rawIds: string | null) {
  const ids = parseIds(rawIds);
  const emoji = (await resolveSets(ids)).map((item) => ({
    ...item,
    pageUrl: listedPackName(item.set) ? emojiPackPath(item.set, item.id) : null,
    telegramUrl: telegramPackUrl(item.set),
  }));
  return { ok: true as const, ...catalogVersion, emoji };
}
