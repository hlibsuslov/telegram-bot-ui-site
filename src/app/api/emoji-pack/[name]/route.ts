// GET /api/emoji-pack/<name>: the custom emoji of a public pack (ids, fallbacks, formats,
// picture URLs) for bot-ui Studio. Read-only; the bot token stays on the server.
import { allow, clientKey, errorResponse, resolvePack, ResolverError } from "@/lib/emoji-pack";
import { listedPackName } from "@/lib/emoji-pack-list";
import { emojiPackPath, telegramPackUrl } from "@/lib/emoji-links";
import { emojiFacets, packFacets } from "@/lib/emoji-facets";

export async function GET(req: Request, ctx: RouteContext<"/api/emoji-pack/[name]">) {
  const { name } = await ctx.params;
  try {
    if (!allow(`pack:${clientKey(req)}`)) throw new ResolverError("RATE_LIMITED", 429, "too many packs at once; retry in a minute", 60);
    const pack = await resolvePack(name);
    const pageUrl = pack.emoji.length && listedPackName(pack.name) ? emojiPackPath(pack.name) : null;
    const pf = packFacets(pack.name);
    const emoji = pf ? pack.emoji.map((e) => ({ ...e, facets: emojiFacets(pack.name, e.id) })) : pack.emoji;
    return Response.json({ ok: true, ...pack, emoji, facets: pf?.facets ?? null, compatible: pf?.compatible ?? [], pageUrl, telegramUrl: telegramPackUrl(pack.name) }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
