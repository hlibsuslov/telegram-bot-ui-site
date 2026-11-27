// Starts a pack for the logged-in visitor. The browser sends frames of the whole mosaic with the request; they pass
// the content check before a single tile reaches Telegram. Then a signed job names the new set.
import { allow } from "@/lib/emoji-pack";
import { blockUser, isBlocked, moderateFrames } from "@/lib/emoji-mosaic-moderation";
import { MosaicError, mosaicConfig, mosaicErrorResponse, newJob, readSession, sameOrigin } from "@/lib/emoji-mosaic-server";

const PACKS_PER_HOUR = 10;
const FRAMES_MAX_BYTES = 4 * 1024 * 1024;
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const config = await mosaicConfig();
    if (!config) throw new MosaicError(404, "DISABLED", "pack creation isn't set up on this site");
    sameOrigin(req);
    const user = readSession(req, config.token);
    if (!user) throw new MosaicError(401, "LOGIN_REQUIRED", "log in with Telegram first");
    if (isBlocked(user.id)) throw new MosaicError(403, "BLOCKED", "an earlier pack failed the content check; try again tomorrow");
    if (Number(req.headers.get("content-length") ?? 0) > FRAMES_MAX_BYTES) throw new MosaicError(413, "TOO_BIG", "the preview frames are too large");
    const form = await req.formData().catch(() => null);
    if (!form) throw new MosaicError(400, "BAD_REQUEST", "send count, cols, format and frames as a form");
    if (!allow(`mosaic-pack:${user.id}`, PACKS_PER_HOUR, 60 * 60 * 1000)) throw new MosaicError(429, "PACK_LIMIT", `at most ${PACKS_PER_HOUR} packs an hour; try later`, 3600);
    const frames = await Promise.all(form.getAll("frame").filter((f): f is File => f instanceof Blob).map(async (f) => ({ data: new Uint8Array(await f.arrayBuffer()), type: "image/jpeg" as const })));
    let verdict;
    try {
      verdict = await moderateFrames(frames);
    } catch {
      throw new MosaicError(503, "CHECK_UNAVAILABLE", "the content check is unavailable; try again later");
    }
    if (!verdict.allowed) {
      blockUser(user.id);
      console.warn("mosaic: frames refused", JSON.stringify({ owner: user.id, categories: verdict.categories }));
      throw new MosaicError(422, "CONTENT_REFUSED", `This pack can't be published: ${verdict.reason}`);
    }
    const { job, name } = newJob(user, { count: Number(form.get("count")), cols: Number(form.get("cols")), format: String(form.get("format")) }, config);
    return Response.json({ ok: true, job, name }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return mosaicErrorResponse(err);
  }
}
