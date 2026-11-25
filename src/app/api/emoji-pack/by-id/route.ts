// GET /api/emoji-pack/by-id?ids=1,2,3: the pack (set name) of each custom emoji id, so bot-ui
// can import the packs an existing bot already uses. Read-only (getCustomEmojiStickers); ids
// Telegram does not know are left out. A static segment, so it never collides with a pack
// name (pack names have no "-").
import { connection } from "next/server";
import { allow, clientKey, errorResponse, parseIds, resolveSets, ResolverError } from "@/lib/emoji-pack";
import { RATE_LIMITS } from "@/lib/emoji-api-contract";
import { listedPackName } from "@/lib/emoji-pack-list";
import { emojiPackPath, telegramPackUrl } from "@/lib/emoji-links";
import { catalogVersion } from "@/lib/emoji-facets";

export async function GET(req: Request) {
  // Every answer depends on the query: never prerender this route at build time.
  await connection();
  try {
    if (!allow(`ids:${clientKey(req)}`, RATE_LIMITS.ids)) throw new ResolverError("RATE_LIMITED", 429, "too many lookups at once; retry in a minute", 60);
    const ids = parseIds(new URL(req.url).searchParams.get("ids"));
    const emoji = (await resolveSets(ids)).map((item) => ({
      ...item,
      pageUrl: listedPackName(item.set) ? emojiPackPath(item.set, item.id) : null,
      telegramUrl: telegramPackUrl(item.set),
    }));
    return Response.json({ ok: true, ...catalogVersion, emoji }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
