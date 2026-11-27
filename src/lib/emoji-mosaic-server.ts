// Packs made on the mosaic page, server side. A visitor logs in with Telegram (the Login Widget, which also lets
// the bot write to them), and the site's mosaic bot creates a custom emoji set OWNED BY THAT VISITOR, one tile per
// request, then sends them the mosaic.
//
// The bot's token (MOSAIC_BOT_TOKEN) is read on the server only and sent only to api.telegram.org through
// node:https, so Next.js fetch logging never sees the URL that carries it. It is a separate bot from the emoji
// library's resolver: abuse of one never takes the other down. Without the variables the feature is off and the
// page offers the ZIP and the skill instead.
//
// Sessions and jobs are stateless: HMAC-signed with a key derived from the token. Limits are per instance (like the
// rest of the site's API), so they slow abuse down rather than stop a determined one; every set is created under
// the visitor's own Telegram id and logged with it, so the owner can answer a report with deleteStickerSet.
import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { request } from "node:https";
import { MAX_EMOJI, MAX_VIDEO_BYTES, mosaicMessage } from "./emoji-mosaic";

export const SESSION_COOKIE = "mosaic_session";
const SESSION_SECONDS = 2 * 60 * 60;
const JOB_SECONDS = 60 * 60;
const LOGIN_MAX_AGE_SECONDS = 24 * 60 * 60;
const STATIC_MAX_BYTES = 128 * 1024;
const TIMEOUT_MS = 30_000;
export const FALLBACK = "⬜";
/** Every pack made on the site carries the same title. */
export const PACK_TITLE = "Mosaic image via @hlixli";

export type MosaicUser = { id: number; name: string };
export type Job = { uid: number; name: string; title: string; count: number; cols: number; format: "video" | "static"; exp: number };
export type BotCall = (method: string, params: Record<string, unknown>, file?: { field: string; name: string; type: string; data: Uint8Array }) => Promise<unknown>;

export class MosaicError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly retryAfter?: number) {
    super(message);
  }
}

const usernames = new Map<string, Promise<string | null>>();

/** The pack bot's token and username. The username comes from MOSAIC_BOT_USERNAME or, once per instance, getMe. */
export async function mosaicConfig(): Promise<{ token: string; username: string } | null> {
  const token = process.env.MOSAIC_BOT_TOKEN?.trim();
  if (!token || !/^\d+:[\w-]+$/.test(token)) return null;
  // No content check, no pack creation: the feature stays off until ANTHROPIC_API_KEY is set too.
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return null;
  const fixed = process.env.MOSAIC_BOT_USERNAME?.trim().replace(/^@/, "");
  if (fixed) return /^\w{5,32}$/.test(fixed) ? { token, username: fixed } : null;
  let lookup = usernames.get(token);
  if (!lookup) {
    lookup = botCaller(token)("getMe", {}).then((me) => (me as { username?: string }).username ?? null).catch(() => null);
    usernames.set(token, lookup);
    void lookup.then((name) => { if (!name) usernames.delete(token); });
  }
  const username = await lookup;
  return username && /^\w{5,32}$/.test(username) ? { token, username } : null;
}

// ------------------------------------------------------------------ login and signed values

/** Telegram Login Widget: the hash is HMAC-SHA256 of the sorted "key=value" lines with SHA256(bot token) as key.
 *  https://core.telegram.org/widgets/login#checking-authorization */
export function verifyLogin(data: Record<string, unknown>, token: string, now = Date.now()): MosaicUser | null {
  const hash = typeof data.hash === "string" ? data.hash : "";
  const fields = Object.entries(data).filter(([k, v]) => k !== "hash" && v !== undefined && v !== null && typeof v !== "object");
  const check = fields.map(([k, v]) => `${k}=${String(v)}`).sort().join("\n");
  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(check).digest("hex");
  if (!/^[0-9a-f]{64}$/.test(hash) || !timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) return null;
  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate) || now / 1000 - authDate > LOGIN_MAX_AGE_SECONDS || authDate - now / 1000 > 300) return null;
  const id = Number(data.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const name = [data.first_name, data.last_name].filter((v) => typeof v === "string" && v).join(" ").slice(0, 64) || (typeof data.username === "string" ? `@${data.username}` : "Telegram user");
  return { id, name };
}

function key(token: string, purpose: string): Buffer {
  return createHmac("sha256", token).update(`mosaic:${purpose}`).digest();
}

function sign(value: object, token: string, purpose: string): string {
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${body}.${createHmac("sha256", key(token, purpose)).update(body).digest("base64url")}`;
}

function unsign<T extends { exp: number }>(text: string | null | undefined, token: string, purpose: string, now = Date.now()): T | null {
  if (!text || text.length > 2048) return null;
  const [body, mac] = text.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", key(token, purpose)).update(body).digest("base64url");
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    return typeof value.exp === "number" && value.exp > now / 1000 ? value : null;
  } catch {
    return null;
  }
}

export function sessionCookie(user: MosaicUser, token: string, now = Date.now()): string {
  const value = sign({ ...user, exp: Math.floor(now / 1000) + SESSION_SECONDS }, token, "session");
  return `${SESSION_COOKIE}=${value}; Path=/api/mosaic; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export const clearedCookie = `${SESSION_COOKIE}=; Path=/api/mosaic; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function readSession(req: Request, token: string, now = Date.now()): MosaicUser | null {
  const raw = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  const value = unsign<MosaicUser & { exp: number }>(raw, token, "session", now);
  return value ? { id: value.id, name: value.name } : null;
}

/** A new set for this visitor: a name only the bot can create (…_by_<bot>), owned by the visitor's id. */
export function newJob(user: MosaicUser, spec: { count: number; cols: number; format: string }, config: { token: string; username: string }, now = Date.now()): { job: string; name: string } {
  const { count, cols, format } = spec;
  if (!Number.isInteger(count) || count < 1 || count > MAX_EMOJI) throw new MosaicError(400, "BAD_GRID", `a mosaic has 1-${MAX_EMOJI} tiles`);
  if (!Number.isInteger(cols) || cols < 1 || cols > 16 || count % cols !== 0) throw new MosaicError(400, "BAD_GRID", "the column count doesn't divide the tiles");
  if (format !== "video" && format !== "static") throw new MosaicError(400, "BAD_FORMAT", "format is video or static");
  const name = `m${user.id.toString(36)}_${randomBytes(4).toString("hex")}_by_${config.username}`.toLowerCase();
  if (name.length > 64 || name.includes("__")) throw new MosaicError(500, "NAME", "can't build a set name for this bot");
  const job: Job = { uid: user.id, name, title: PACK_TITLE, count, cols, format, exp: Math.floor(now / 1000) + JOB_SECONDS };
  return { job: sign(job, config.token, "job"), name };
}

export function readJob(text: string | null | undefined, user: MosaicUser, token: string, now = Date.now()): Job {
  const job = unsign<Job>(text, token, "job", now);
  if (!job || job.uid !== user.id) throw new MosaicError(403, "BAD_JOB", "this pack job expired or isn't yours; start again");
  return job;
}

// ------------------------------------------------------------------ tiles

/** WEBM (EBML header) for video, PNG or WEBP for static; sizes from Telegram's sticker requirements. */
export function checkTile(data: Uint8Array, format: Job["format"]): string {
  if (format === "video") {
    if (data.length > MAX_VIDEO_BYTES) throw new MosaicError(413, "TILE_TOO_BIG", "a video emoji is at most 256 KB");
    if (!(data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3)) throw new MosaicError(415, "NOT_WEBM", "a video tile must be WEBM");
    return "video/webm";
  }
  if (data.length > STATIC_MAX_BYTES) throw new MosaicError(413, "TILE_TOO_BIG", "a static tile is too large");
  const png = data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47;
  if (png && new DataView(data.buffer, data.byteOffset).getUint32(16) === 100 && new DataView(data.buffer, data.byteOffset).getUint32(20) === 100) return "image/png";
  throw new MosaicError(415, "NOT_100X100_PNG", "a static tile must be a 100x100 PNG");
}

export type StickerSet = { sticker_type?: string; stickers?: { custom_emoji_id?: string; emoji?: string; file_id?: string }[] };
/** Checks what the finished set really holds; `allowed: false` deletes it. */
export type Inspect = (set: StickerSet) => Promise<{ allowed: boolean; reason: string; categories?: string[] }>;

async function readSet(call: BotCall, name: string): Promise<StickerSet | null> {
  try {
    return (await call("getStickerSet", { name })) as StickerSet;
  } catch (err) {
    if (err instanceof MosaicError && err.status === 400) return null;
    throw err;
  }
}

const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3)[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200D\uFE0F\u20E3]*$/u;

/** One emoji shown where the custom emoji can't be: the sticker's emoji_list and the message's alt text. */
export function cleanEmoji(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length <= 16 && EMOJI.test(text) ? text : FALLBACK;
}

/** Adds tile `index` in order. The set's own length is the cursor, so a retried request never adds twice:
 *  a tile already in the set is skipped, a tile ahead of the set is refused. */
export async function addTile(call: BotCall, job: Job, index: number, data: Uint8Array, emoji: unknown = FALLBACK): Promise<{ added: boolean; have: number }> {
  if (!Number.isInteger(index) || index < 0 || index >= job.count) throw new MosaicError(400, "BAD_INDEX", "tile index out of range");
  const type = checkTile(data, job.format);
  const set = await readSet(call, job.name);
  const have = set?.stickers?.length ?? 0;
  if (set && set.sticker_type !== "custom_emoji") throw new MosaicError(409, "NOT_EMOJI_SET", "that set isn't a custom emoji set");
  if (index < have) return { added: false, have };
  if (index > have) throw new MosaicError(409, "OUT_OF_ORDER", `send tile ${have + 1} first`);
  const format = job.format === "video" ? "video" : "static";
  const file = (await call("uploadStickerFile", { user_id: job.uid, sticker_format: format }, { field: "sticker", name: type === "video/webm" ? "tile.webm" : "tile.png", type, data })) as { file_id: string };
  const sticker = { sticker: file.file_id, format, emoji_list: [cleanEmoji(emoji)] };
  if (have === 0) {
    await call("createNewStickerSet", { user_id: job.uid, name: job.name, title: job.title, sticker_type: "custom_emoji", stickers: [sticker] });
    console.info("mosaic: set created", JSON.stringify({ owner: job.uid, set: job.name, tiles: job.count }));
  } else {
    await call("addStickerToSet", { user_id: job.uid, name: job.name, sticker });
  }
  return { added: true, have: have + 1 };
}

/** Reads the set back, sends the mosaic to its owner and says whether every custom emoji survived. */
export async function finishPack(call: BotCall, job: Job, inspect: Inspect) {
  const set = await readSet(call, job.name);
  const ids = (set?.stickers ?? []).map((s) => s.custom_emoji_id ?? "");
  if (!set || set.sticker_type !== "custom_emoji" || ids.length !== job.count || ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new MosaicError(409, "INCOMPLETE", `the set holds ${ids.length} of ${job.count} emoji; send the missing tiles`);
  }
  // The authoritative check runs on the set itself. Anything but a clear pass removes the set before its link or
  // the mosaic leaves the server.
  let verdict: Awaited<ReturnType<Inspect>>;
  try {
    verdict = await inspect(set);
  } catch (err) {
    await call("deleteStickerSet", { name: job.name }).catch(() => {});
    throw err instanceof MosaicError ? err : new MosaicError(503, "CHECK_UNAVAILABLE", "the content check is unavailable; try again later");
  }
  if (!verdict.allowed) {
    await call("deleteStickerSet", { name: job.name }).catch(() => {});
    console.warn("mosaic: set refused and deleted", JSON.stringify({ owner: job.uid, set: job.name, categories: verdict.categories ?? [] }));
    throw new MosaicError(422, "CONTENT_REFUSED", `This pack can't be published: ${verdict.reason}`);
  }
  const body = mosaicMessage(ids, job.cols, (set.stickers ?? []).map((s) => cleanEmoji(s.emoji)));
  let delivered = false;
  let sent = 0;
  try {
    const message = (await call("sendMessage", { chat_id: job.uid, ...body })) as { entities?: { type: string }[] };
    sent = (message.entities ?? []).filter((e) => e.type === "custom_emoji").length;
    delivered = sent === ids.length;
  } catch (err) {
    if (!(err instanceof MosaicError) || err.status === 429) throw err;
  }
  return { set: job.name, link: `https://t.me/addemoji/${job.name}`, ids, sent, delivered, text: body.text, entities: body.entities };
}

// ------------------------------------------------------------------ Bot API over node:https

export function botCaller(token: string): BotCall {
  return (method, params, file) => new Promise((resolve, reject) => {
    let body: Buffer;
    let type: string;
    if (file) {
      const boundary = `----mosaic${randomBytes(12).toString("hex")}`;
      const parts: Buffer[] = [];
      for (const [k, v] of Object.entries(params)) parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${typeof v === "string" ? v : JSON.stringify(v)}\r\n`));
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`), Buffer.from(file.data), Buffer.from(`\r\n--${boundary}--\r\n`));
      body = Buffer.concat(parts);
      type = `multipart/form-data; boundary=${boundary}`;
    } else {
      body = Buffer.from(JSON.stringify(params));
      type = "application/json";
    }
    const req = request({ host: "api.telegram.org", path: `/bot${token}/${method}`, method: "POST", headers: { "Content-Type": type, "Content-Length": body.length }, timeout: TIMEOUT_MS }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        try {
          const answer = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { ok: boolean; result?: unknown; error_code?: number; description?: string; parameters?: { retry_after?: number } };
          if (answer.ok) return resolve(answer.result);
          const retry = answer.parameters?.retry_after;
          const status = answer.error_code === 429 ? 429 : answer.error_code === 400 ? 400 : 502;
          reject(new MosaicError(status, answer.error_code === 429 ? "RATE_LIMITED" : "TELEGRAM", `${method}: ${(answer.description ?? "Telegram error").slice(0, 200)}`, retry));
        } catch {
          reject(new MosaicError(502, "TELEGRAM", `${method}: unreadable answer`));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", () => reject(new MosaicError(504, "TELEGRAM_UNREACHABLE", `${method}: Telegram didn't answer; try again`)));
    req.end(body);
  });
}

/** Cookie-carrying POSTs must come from this site: SameSite=Strict plus an Origin check. */
export function sameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) throw new MosaicError(403, "CROSS_SITE", "requests must come from this site");
}

export function mosaicErrorResponse(err: unknown): Response {
  const e = err instanceof MosaicError ? err : new MosaicError(500, "INTERNAL", "mosaic error");
  if (!(err instanceof MosaicError)) console.error("mosaic:", err instanceof Error ? err.name : "unknown error");
  const headers: Record<string, string> = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (e.retryAfter) headers["Retry-After"] = String(e.retryAfter);
  return Response.json({ ok: false, error: { code: e.code, message: e.message, retryAfter: e.retryAfter ?? null } }, { status: e.status, headers });
}
