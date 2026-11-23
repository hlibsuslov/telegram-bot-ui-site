// GET /api/emoji-pack/by-id?ids=1,2,3: the pack (set name) of each custom emoji id, so bot-ui
// can import the packs an existing bot already uses. Read-only (getCustomEmojiStickers); ids
// Telegram does not know are left out. A static segment, so it never collides with a pack
// name (pack names have no "-").
import { allow, clientKey, errorResponse, parseIds, resolveSets, ResolverError } from "@/lib/emoji-pack";

export async function GET(req: Request) {
  try {
    if (!allow(`ids:${clientKey(req)}`)) throw new ResolverError("RATE_LIMITED", 429, "too many lookups at once; retry in a minute");
    const ids = parseIds(new URL(req.url).searchParams.get("ids"));
    const emoji = await resolveSets(ids);
    return Response.json({ ok: true, emoji }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
