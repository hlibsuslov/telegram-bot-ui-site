// GET /api/emoji-search?q=<words or emoji>[&pack=<name>]: emoji and packs of the library ranked
// for the query, with suggestions (see lib/emoji-search.ts for how matching works).
import { connection } from "next/server";
import { allow, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";
import { RATE_LIMITS } from "@/lib/emoji-api-contract";
import { searchAnswer } from "@/lib/emoji-answers";

export async function GET(req: Request) {
  await connection();
  try {
    if (!allow(`search:${clientKey(req)}`, RATE_LIMITS.search)) {
      throw new ResolverError("RATE_LIMITED", 429, "too many searches; retry in a minute", 60);
    }
    const url = new URL(req.url);
    const answer = await searchAnswer(url.searchParams.get("q") ?? "", url.searchParams.get("pack") ?? undefined);
    return Response.json(answer, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
