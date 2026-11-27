// One tile of a pack, in order: multipart form with job, index and tile. Small bodies (a tile is at most 256 KB)
// keep every request well inside the platform's body limit.
import { allow } from "@/lib/emoji-pack";
import { isBlocked } from "@/lib/emoji-mosaic-moderation";
import { addTile, botCaller, MosaicError, mosaicConfig, mosaicErrorResponse, readJob, readSession, sameOrigin } from "@/lib/emoji-mosaic-server";

const TILES_PER_TEN_MINUTES = 320;

export async function POST(req: Request) {
  try {
    const config = await mosaicConfig();
    if (!config) throw new MosaicError(404, "DISABLED", "pack creation isn't set up on this site");
    sameOrigin(req);
    const user = readSession(req, config.token);
    if (!user) throw new MosaicError(401, "LOGIN_REQUIRED", "log in with Telegram first");
    if (isBlocked(user.id)) throw new MosaicError(403, "BLOCKED", "an earlier pack failed the content check; try again tomorrow");
    if (Number(req.headers.get("content-length") ?? 0) > 300 * 1024) throw new MosaicError(413, "TILE_TOO_BIG", "a tile is at most 256 KB");
    const form = await req.formData().catch(() => null);
    const tile = form?.get("tile");
    if (!form || !(tile instanceof Blob)) throw new MosaicError(400, "BAD_REQUEST", "send job, index and tile as a form");
    const job = readJob(String(form.get("job") ?? ""), user, config.token);
    if (!allow(`mosaic-tile:${user.id}`, TILES_PER_TEN_MINUTES, 10 * 60 * 1000)) throw new MosaicError(429, "TILE_LIMIT", "too many tiles; wait a few minutes", 120);
    const result = await addTile(botCaller(config.token), job, Number(form.get("index")), new Uint8Array(await tile.arrayBuffer()), form.get("emoji"));
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return mosaicErrorResponse(err);
  }
}
