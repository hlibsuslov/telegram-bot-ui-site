// GET /api/emoji-search?q=<words or emoji>[&pack=<name>]: emoji and packs of the library ranked
// for the query, with suggestions (see lib/emoji-search.ts for how matching works).
import { connection } from "next/server";
import { allow, clientKey } from "@/lib/emoji-pack";
import { getLibrary } from "@/lib/emoji-library";
import { search } from "@/lib/emoji-search";

export async function GET(req: Request) {
  await connection();
  if (!allow(`search:${clientKey(req)}`, 240)) {
    return Response.json({ ok: false, error: { code: "RATE_LIMITED", message: "too many searches; retry in a minute" } }, { status: 429 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 100);
  const pack = url.searchParams.get("pack") ?? undefined;
  // An empty query answers at once: it must not wake the whole catalog up.
  if (!q.trim()) return Response.json({ ok: true, ...search({ packs: [], emoji: [], revision: "" }, "") });
  const library = await getLibrary();
  const result = search(library.source, q, { pack, limit: pack ? 200 : 60 });
  return Response.json({ ok: true, ...result }, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600", "X-Content-Type-Options": "nosniff" },
  });
}
