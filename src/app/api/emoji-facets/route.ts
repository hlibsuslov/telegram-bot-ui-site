// GET /api/emoji-facets: the tag taxonomy and every listed pack's faceted tags (style, colour,
// palette, theme fit, motion, topic, mood, interface roles, bot categories, compatible packs), each
// with a confidence. One request lets an agent rank packs for a bot without reading every pack.
// Static data built by scripts/emoji_taxonomy.py; no Telegram call.
import { allow, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";
import { allPackFacets, facetsMeta, taxonomy } from "@/lib/emoji-facets";

export async function GET(req: Request) {
  try {
    if (!allow(`facets:${clientKey(req)}`, 60)) throw new ResolverError("RATE_LIMITED", 429, "too many requests; retry in a minute", 60);
    const facets = Object.fromEntries(Object.entries(taxonomy.facets).map(([id, f]) => [id, {
      label: f.label, measured: !!f.measured, scope: f.scope,
      values: Object.fromEntries(Object.entries(f.values).map(([v, d]) => [v, { en: d.en, ru: d.ru }])),
    }]));
    return Response.json({ ok: true, ...facetsMeta, taxonomy: { version: taxonomy.version, facets }, packs: allPackFacets() }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
