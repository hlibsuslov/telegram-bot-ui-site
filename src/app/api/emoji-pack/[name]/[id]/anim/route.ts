// GET /api/emoji-pack/<name>/<id>/anim: the animation of an animated (TGS) emoji of that pack,
// as Telegram stores it (gzip-compressed Lottie). The client decompresses and plays it.
// Proxied, because Telegram's file URL contains the bot token.
import { allow, animationFile, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";

export async function GET(req: Request, ctx: RouteContext<"/api/emoji-pack/[name]/[id]/anim">) {
  const { name, id } = await ctx.params;
  try {
    if (!allow(`anim:${clientKey(req)}`, 600)) throw new ResolverError("RATE_LIMITED", 429, "too many animations at once; retry in a minute");
    const { body, type } = await animationFile(name, id);
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
