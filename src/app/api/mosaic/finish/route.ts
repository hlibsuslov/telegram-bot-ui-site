// Reads the finished set back, checks what it really holds (tiles from Telegram, stacked into frames, shown to the
// content check), and only then sends the mosaic to its owner. A refused set is deleted at once.
import { framesFromTiles, readTiles } from "@/lib/emoji-mosaic-frames";
import { blockUser, moderateFrames } from "@/lib/emoji-mosaic-moderation";
import { botCaller, finishPack, MosaicError, mosaicConfig, mosaicErrorResponse, readJob, readSession, sameOrigin } from "@/lib/emoji-mosaic-server";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const config = await mosaicConfig();
    if (!config) throw new MosaicError(404, "DISABLED", "pack creation isn't set up on this site");
    sameOrigin(req);
    const user = readSession(req, config.token);
    if (!user) throw new MosaicError(401, "LOGIN_REQUIRED", "log in with Telegram first");
    const body = (await req.json().catch(() => null)) as { job?: string } | null;
    const job = readJob(body?.job, user, config.token);
    const call = botCaller(config.token);
    const result = await finishPack(call, job, async (set) => {
      const tiles = await readTiles(call, config.token, (set.stickers ?? []).map((s) => s.file_id ?? ""));
      const frames = await framesFromTiles(tiles, job.cols, job.format);
      const verdict = await moderateFrames(frames.map((data) => ({ data, type: "image/jpeg" as const })));
      if (!verdict.allowed) blockUser(user.id);
      return verdict;
    });
    return Response.json({ ok: true, set: result.set, link: result.link, sent: result.sent, expected: result.ids.length, delivered: result.delivered }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return mosaicErrorResponse(err);
  }
}
