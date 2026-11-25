// GET /api/emoji-search?q=<words or emoji>[&pack=<name>]: emoji and packs of the library ranked
// for the query, with suggestions (see lib/emoji-search.ts for how matching works).
import { connection } from "next/server";
import { allow, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";
import { RATE_LIMITS } from "@/lib/emoji-api-contract";
import { getLibrary } from "@/lib/emoji-library";
import { emojiPackPath } from "@/lib/emoji-links";
import { search } from "@/lib/emoji-search";
import { catalogVersion, emojiFacets, packFacets } from "@/lib/emoji-facets";

export async function GET(req: Request) {
  await connection();
  try {
    if (!allow(`search:${clientKey(req)}`, RATE_LIMITS.search)) {
      throw new ResolverError("RATE_LIMITED", 429, "too many searches; retry in a minute", 60);
    }
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").slice(0, 160);
    const pack = url.searchParams.get("pack") ?? undefined;
    // An empty query answers at once: it must not wake the whole catalog up.
    if (!q.trim()) return Response.json({ ok: true, ...catalogVersion, ...search({ packs: [], emoji: [], revision: "" }, "") });
    const library = await getLibrary();
    const result = search(library.source, q, { pack, limit: pack ? 200 : 60 });
    return Response.json({
      ok: true,
      ...catalogVersion,
      ...result,
      emoji: result.emoji.map((hit) => ({ ...hit, facets: emojiFacets(hit.pack, hit.id), pageUrl: emojiPackPath(hit.pack, hit.id) })),
      packs: result.packs.map((hit) => ({ ...hit, facets: packFacets(hit.name)?.facets ?? {}, pageUrl: emojiPackPath(hit.name) })),
    }, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
