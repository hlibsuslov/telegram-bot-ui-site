// GET /api/emoji-facets: the tag taxonomy and every listed pack's faceted tags (style, colour,
// palette, theme fit, motion, topic, mood, interface roles, bot categories, compatible packs), each
// with a confidence. One request lets an agent rank packs for a bot without reading every pack.
// Static data built by scripts/emoji_taxonomy.py; no Telegram call.
import { allow, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";
import { RATE_LIMITS } from "@/lib/emoji-api-contract";
import { facetsAnswer } from "@/lib/emoji-answers";

export async function GET(req: Request) {
  try {
    if (!allow(`facets:${clientKey(req)}`, RATE_LIMITS.facets)) throw new ResolverError("RATE_LIMITED", 429, "too many requests; retry in a minute", 60);
    return Response.json(facetsAnswer(), {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
