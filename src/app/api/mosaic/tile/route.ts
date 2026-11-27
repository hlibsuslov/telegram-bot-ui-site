// Tiles of a pack, in order: a multipart form with job, then index, emoji and tile repeated for each tile of an
// unbroken run. A run is capped well under the platform's 4.5 MB body limit; a tile is at most 256 KB.
import { allow } from "@/lib/emoji-pack";
import { isBlocked } from "@/lib/emoji-mosaic-moderation";
import { addTiles, botCaller, MosaicError, mosaicConfig, mosaicErrorResponse, readJob, readSession, sameOrigin } from "@/lib/emoji-mosaic-server";

const TILES_PER_TEN_MINUTES = 320;
const RUN_MAX_BYTES = 3.5 * 1024 * 1024;
const RUN_MAX_TILES = 50;
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const config = await mosaicConfig();
    if (!config) throw new MosaicError(404, "DISABLED", "pack creation isn't set up on this site");
    sameOrigin(req);
    const user = readSession(req, config.token);
    if (!user) throw new MosaicError(401, "LOGIN_REQUIRED", "log in with Telegram first");
    if (isBlocked(user.id)) throw new MosaicError(403, "BLOCKED", "an earlier pack failed the content check; try again tomorrow");
    if (Number(req.headers.get("content-length") ?? 0) > RUN_MAX_BYTES) throw new MosaicError(413, "TILE_TOO_BIG", "send fewer tiles at once");
    const form = await req.formData().catch(() => null);
    const files = form?.getAll("tile") ?? [];
    if (!form || !files.length || files.length > RUN_MAX_TILES || files.some((f) => !(f instanceof Blob))) throw new MosaicError(400, "BAD_REQUEST", `send job, then index, emoji and tile for 1-${RUN_MAX_TILES} tiles, as a form`);
    const indexes = form.getAll("index").map(Number);
    const emoji = form.getAll("emoji");
    if (indexes.length !== files.length) throw new MosaicError(400, "BAD_REQUEST", "one index for each tile");
    const job = readJob(String(form.get("job") ?? ""), user, config.token);
    for (let i = 0; i < files.length; i++) {
      if (!allow(`mosaic-tile:${user.id}`, TILES_PER_TEN_MINUTES, 10 * 60 * 1000)) throw new MosaicError(429, "TILE_LIMIT", "too many tiles; wait a few minutes", 120);
    }
    const tiles = await Promise.all(files.map(async (f, i) => ({ index: indexes[i], data: new Uint8Array(await (f as Blob).arrayBuffer()), emoji: emoji[i] })));
    const result = await addTiles(botCaller(config.token), job, tiles);
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return mosaicErrorResponse(err);
  }
}
