// GET /api/emoji-pack/<name>/<id>: the picture of one emoji of that pack (WEBP, WEBM, or the
// static thumbnail of a TGS). Proxied, because Telegram's file URL contains the bot token.
import { allow, clientKey, errorResponse, previewFile, ResolverError } from "@/lib/emoji-pack";

export async function GET(req: Request, ctx: RouteContext<"/api/emoji-pack/[name]/[id]">) {
  const { name, id } = await ctx.params;
  try {
    if (!allow(`file:${clientKey(req)}`, 600)) throw new ResolverError("RATE_LIMITED", 429, "too many pictures at once; retry in a minute");
    const { body, type } = await previewFile(name, id);
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
