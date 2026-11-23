// GET /api/emoji-pack/<name>/<id>/still: the thumbnail of a video emoji of that pack (WEBP or JPG),
// shown until the emoji plays, so a page of video emoji does not start a video decoder for each.
// Proxied, because Telegram's file URL contains the bot token.
import { allow, canonicalOnly, clientKey, errorResponse, ResolverError, stillFile } from "@/lib/emoji-pack";

export async function GET(req: Request, ctx: RouteContext<"/api/emoji-pack/[name]/[id]/still">) {
  const { name, id } = await ctx.params;
  try {
    canonicalOnly(req);
    if (!allow(`file:${clientKey(req)}`, 1500)) throw new ResolverError("RATE_LIMITED", 429, "too many pictures at once; retry in a minute");
    const { body, type } = await stillFile(name, id);
    return new Response(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
