// GET /api/emoji-pack/<name>: the custom emoji of a public pack (ids, fallbacks, formats,
// picture URLs) for bot-ui Studio. Read-only; the bot token stays on the server.
import { allow, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";
import { RATE_LIMITS } from "@/lib/emoji-api-contract";
import { packAnswer } from "@/lib/emoji-answers";

export async function GET(req: Request, ctx: RouteContext<"/api/emoji-pack/[name]">) {
  const { name } = await ctx.params;
  try {
    if (!allow(`pack:${clientKey(req)}`, RATE_LIMITS.pack)) throw new ResolverError("RATE_LIMITED", 429, "too many packs at once; retry in a minute", 60);
    return Response.json(await packAnswer(name), {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
