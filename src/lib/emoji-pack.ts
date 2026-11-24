// Premium emoji pack resolver for bot-ui Studio: reads a public custom emoji set with the
// site's own bot, so a Studio user only sends the pack name and never needs a bot token.
//
// The token (EMOJI_RESOLVER_BOT_TOKEN) is read on the server only and sent only to
// api.telegram.org. Requests go through node:https, not fetch, so Next.js fetch tracing and
// logging never see the URL that carries it; it is never logged, returned or used as a cache
// key. Only the read-only methods getStickerSet and getFile are called and nothing is sent to
// any chat, so a bot that already runs with the same token (polling or webhook) keeps working.
//
// Cost control: the CDN caches every answer (Cache-Control in the routes); behind it each
// instance keeps successful sets for an hour, joins concurrent requests for the same pack,
// runs at most MAX_CONCURRENT Bot API calls and DOWNLOADS_CONCURRENT file downloads at a time, keeps
// pictures in memory (FILE_CACHE_BYTES, least recently used out first), and stops calling Telegram while a 429
// retry_after is running.
import "server-only";
import { request } from "node:https";
import { emojiFile, type Format } from "./emoji-card";
import { fixtureAnimation, fixturePack, fixturePreview, fixturesOn } from "./emoji-fixtures";
import { PACK_NAME } from "./emoji-pack-list";

export const EMOJI_ID = /^\d{1,20}$/;
const FILE_PATH = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*$/;
const PACK_MAX = 200;
export const FILE_MAX = 512 * 1024;
const JSON_MAX = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const SET_TTL_MS = 60 * 60 * 1000;
const SET_CACHE_MAX = 500;
const MAX_CONCURRENT = 8;          // Bot API calls in flight per instance
const QUEUE_MAX = 200;               // requests allowed to wait for a pool slot
const DOWNLOADS_CONCURRENT = 16;   // file downloads in flight per instance (a page asks for hundreds of pictures)
const FILE_CACHE_BYTES = 96 * 1024 * 1024;
const FILE_TTL_MS = 6 * 60 * 60 * 1000;
const PATH_TTL_MS = 50 * 60 * 1000; // Telegram keeps a file_path valid for at least an hour

export type { Format };
/** preview: a picture (WEBP, or the WEBM itself for a video emoji; the static thumbnail of a TGS);
 *  animation: the TGS file of an animated emoji (gzip Lottie), played by the client;
 *  still: the thumbnail of a video emoji, so a page can show many without a video decoder each. */
export interface PackEmoji { id: string; fallback: string; format: Format; adaptive: boolean; preview: string | null; animation: string | null; still: string | null }
export interface Pack { name: string; title: string; emoji: PackEmoji[] }

interface Sticker {
  file_id?: string; custom_emoji_id?: string; emoji?: string; is_animated?: boolean; is_video?: boolean;
  needs_repainting?: boolean; thumbnail?: { file_id?: string };
}
interface StickerSet { name: string; title?: string; sticker_type?: string; stickers?: Sticker[] }

export class ResolverError extends Error {
  constructor(readonly code: string, readonly status: number, message: string, readonly retryAfter?: number) {
    super(message);
  }
}

function missing(code: string, message: string): never {
  throw new ResolverError(code, 404, message);
}

function token(): string {
  const t = process.env.EMOJI_RESOLVER_BOT_TOKEN?.trim();
  if (!t) throw new ResolverError("RESOLVER_OFF", 503, "the emoji resolver is not configured");
  return t;
}

// ------------------------------------------------------------------ Telegram, bounded

let pausedUntil = 0;
type Pool = { active: number; max: number; waiting: (() => void)[] };
const apiPool: Pool = { active: 0, max: MAX_CONCURRENT, waiting: [] };
const filePool: Pool = { active: 0, max: DOWNLOADS_CONCURRENT, waiting: [] };

async function slot<T>(work: () => Promise<T>, pool: Pool = apiPool): Promise<T> {
  if (Date.now() < pausedUntil) {
    const wait = Math.ceil((pausedUntil - Date.now()) / 1000);
    throw new ResolverError("RATE_LIMITED", 429, "busy; retry in a moment", wait);
  }
  if (pool.active >= pool.max) {
    // A flood must not park requests until the function timeout (billed time): refuse past a queue.
    if (pool.waiting.length >= QUEUE_MAX) throw new ResolverError("BUSY", 503, "busy; retry in a moment", 2);
    await new Promise<void>((resolve) => pool.waiting.push(resolve));
    // A 429 may have arrived while this call waited: do not start it into the cooldown.
    if (Date.now() < pausedUntil) {
      pool.waiting.shift()?.();
      throw new ResolverError("RATE_LIMITED", 429, "busy; retry in a moment", Math.ceil((pausedUntil - Date.now()) / 1000));
    }
  }
  pool.active++;
  try {
    return await work();
  } finally {
    pool.active--;
    pool.waiting.shift()?.();
  }
}

/** One HTTPS request to api.telegram.org; no redirects, bounded body, the path never surfaces. */
function telegram(path: string, body: string | null, limit: number): Promise<{ status: number; data: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = request({
      host: "api.telegram.org", path, method: body === null ? "GET" : "POST", timeout: TIMEOUT_MS,
      headers: body === null ? {} : { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        size += c.length;
        if (size > limit) { req.destroy(); reject(new ResolverError("TOO_LARGE", 413, "answer too large")); return; }
        chunks.push(c);
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, data: Buffer.concat(chunks) }));
      res.on("error", () => reject(new ResolverError("TELEGRAM_UNREACHABLE", 502, "Telegram did not answer")));
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => reject(new ResolverError("TELEGRAM_UNREACHABLE", 502, "Telegram did not answer")));
    if (body !== null) req.write(body);
    req.end();
  });
}

/** One read-only Bot API call. Errors carry Telegram's description, never the request URL. */
async function call<T>(method: "getStickerSet" | "getFile" | "getCustomEmojiStickers", params: Record<string, string | string[]>): Promise<T> {
  const path = `/bot${token()}/${method}`;
  const { status, data } = await slot(() => telegram(path, JSON.stringify(params), JSON_MAX));
  let doc: { ok?: boolean; result?: T; description?: string; parameters?: { retry_after?: number } } = {};
  try { doc = JSON.parse(data.toString("utf8")); } catch { /* not JSON */ }
  if (doc.ok) return doc.result as T;
  const desc = String(doc.description ?? `HTTP ${status}`);
  if (status === 429) {
    const wait = Math.min(Math.max(Number(doc.parameters?.retry_after) || 30, 1), 3600);
    pausedUntil = Date.now() + wait * 1000;
    throw new ResolverError("RATE_LIMITED", 429, "Telegram asks to slow down; retry later", wait);
  }
  // A malformed or revoked token answers 404 "Not Found" / 401: that is our config, not a missing pack.
  if (status === 401 || status === 404) throw new ResolverError("RESOLVER_OFF", 503, "the emoji resolver is misconfigured");
  if (/STICKERSET_INVALID/i.test(desc)) throw new ResolverError("PACK_NOT_FOUND", 404, "no such pack");
  throw new ResolverError("TELEGRAM_ERROR", 502, `${method}: ${desc}`.slice(0, 200));
}

// ------------------------------------------------------------------ sets, cached per instance

const sets = new Map<string, { at: number; set: StickerSet }>();
const inflight = new Map<string, Promise<StickerSet>>();
const missingSets = new Map<string, number>(); // pack names Telegram does not know, with when we asked
const MISSING_TTL_MS = 10 * 60 * 1000;

/** The raw set: an hour in memory for successes, ten minutes for "no such pack"; other errors are
 *  never kept. Keys are lower-case, so case variants of one name cost one Telegram call. */
async function stickerSet(name: string): Promise<StickerSet> {
  const key = name.toLowerCase();
  const hit = sets.get(key);
  if (hit && Date.now() - hit.at < SET_TTL_MS) return hit.set;
  const gone = missingSets.get(key);
  if (gone && Date.now() - gone < MISSING_TTL_MS) throw new ResolverError("PACK_NOT_FOUND", 404, "no such pack");
  const running = inflight.get(key);
  if (running) return running;
  const p = call<StickerSet>("getStickerSet", { name })
    .then((set) => {
      if (sets.size >= SET_CACHE_MAX) sets.delete(sets.keys().next().value as string);
      sets.set(key, { at: Date.now(), set });
      return set;
    })
    .catch((err: unknown) => {
      if (err instanceof ResolverError && err.code === "PACK_NOT_FOUND") {
        if (missingSets.size > 5000) missingSets.clear();
        missingSets.set(key, Date.now());
      }
      throw err;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function previewFileId(s: Sticker): string | null {
  if (s.is_animated) return s.thumbnail?.file_id ?? null; // TGS: the static thumbnail
  return s.file_id ?? null; // WEBP or WEBM
}

export async function resolvePack(name: string): Promise<Pack> {
  if (!PACK_NAME.test(name)) throw new ResolverError("PACK_NAME", 400, "a pack name is letters, digits and _");
  if (fixturesOn()) return fixturePack(name) ?? missing("PACK_NOT_FOUND", "no such pack");
  const set = await stickerSet(name);
  if (set.sticker_type !== "custom_emoji") {
    throw new ResolverError("NOT_EMOJI_PACK", 422, `${set.name} is a ${set.sticker_type ?? "regular"} sticker set, not an emoji pack`);
  }
  const emoji: PackEmoji[] = [];
  for (const s of (set.stickers ?? []).slice(0, PACK_MAX)) {
    if (!s.custom_emoji_id || !EMOJI_ID.test(s.custom_emoji_id)) continue;
    emoji.push({
      id: s.custom_emoji_id,
      fallback: typeof s.emoji === "string" ? s.emoji : "",
      format: s.is_video ? "video" : s.is_animated ? "animated" : "static",
      adaptive: !!s.needs_repainting,
      preview: previewFileId(s) ? emojiFile(set.name, s.custom_emoji_id) : null,
      animation: s.is_animated && s.file_id ? emojiFile(set.name, s.custom_emoji_id, "anim") : null,
      still: s.is_video && s.thumbnail?.file_id ? emojiFile(set.name, s.custom_emoji_id, "still") : null,
    });
  }
  return { name: set.name, title: set.title ?? set.name, emoji };
}

// ------------------------------------------------------------------ pack of an emoji id

export const IDS_MAX = 200; // getCustomEmojiStickers takes at most 200 ids
const owners = new Map<string, { at: number; set: string | null }>();
const OWNER_CACHE_MAX = 20_000;

/** Ids from `?ids=1,2,3`: digits only, distinct, at most IDS_MAX. */
export function parseIds(raw: string | null): string[] {
  const ids = [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  if (!ids.length || ids.length > IDS_MAX || !ids.every((id) => EMOJI_ID.test(id))) {
    throw new ResolverError("BAD_REQUEST", 400, `ids: 1 to ${IDS_MAX} custom emoji ids (digits), comma-separated`);
  }
  return ids;
}

/** The pack each custom emoji belongs to. Ids Telegram does not know (or whose pack is gone) are left out. */
export async function resolveSets(ids: string[]): Promise<{ id: string; set: string }[]> {
  const now = Date.now();
  const ask = ids.filter((id) => { const hit = owners.get(id); return !hit || now - hit.at >= SET_TTL_MS; });
  // The answer is built from what this request knows, so a cache clear in between cannot drop ids.
  const known = new Map<string, string | null>(ids.filter((id) => !ask.includes(id)).map((id) => [id, owners.get(id)?.set ?? null]));
  if (ask.length) {
    const stickers = await call<{ custom_emoji_id?: string; set_name?: string }[]>("getCustomEmojiStickers", { custom_emoji_ids: ask });
    const found = new Map<string, string>();
    for (const s of Array.isArray(stickers) ? stickers : []) {
      if (s.custom_emoji_id && s.set_name && PACK_NAME.test(s.set_name)) found.set(s.custom_emoji_id, s.set_name);
    }
    if (owners.size + ask.length > OWNER_CACHE_MAX) owners.clear();
    for (const id of ask) {
      owners.set(id, { at: now, set: found.get(id) ?? null });
      known.set(id, found.get(id) ?? null);
    }
  }
  return ids.flatMap((id) => { const set = known.get(id); return set ? [{ id, set }] : []; });
}

const TYPES: Record<string, string> = { webp: "image/webp", webm: "video/webm", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };
// A TGS sticker is a gzip-compressed Lottie animation (Telegram caps custom emoji TGS at 64 KB).
const ANIM_TYPES: Record<string, string> = { tgs: "application/x-tgsticker" };
const ANIM_MAX = 128 * 1024;

export type FileBody = { body: ArrayBuffer; type: string };

async function sticker(name: string, id: string): Promise<Sticker | undefined> {
  if (!PACK_NAME.test(name) || !EMOJI_ID.test(id)) throw new ResolverError("BAD_REQUEST", 400, "bad pack name or emoji id");
  const set = await stickerSet(name);
  return set.sticker_type === "custom_emoji" ? set.stickers?.find((s) => s.custom_emoji_id === id) : undefined;
}

// Pictures, kept per instance: a library page asks for hundreds of them, and the same ones again on
// every visit until the CDN has them. Least recently used go first past FILE_CACHE_BYTES.
const files = new Map<string, { at: number; data: Buffer; type: string }>();
const filesInflight = new Map<string, Promise<{ data: Buffer; type: string }>>();
const paths = new Map<string, { at: number; path: string; size: number }>();
let cachedBytes = 0;

function remember(key: string, data: Buffer, type: string) {
  const old = files.get(key);
  if (old) { files.delete(key); cachedBytes -= old.data.length; }
  files.set(key, { at: Date.now(), data, type });
  cachedBytes += data.length;
  for (const [k, v] of files) {
    if (cachedBytes <= FILE_CACHE_BYTES) break;
    files.delete(k);
    cachedBytes -= v.data.length;
  }
}

async function filePath(fileId: string): Promise<{ path: string; size: number }> {
  const hit = paths.get(fileId);
  if (hit && Date.now() - hit.at < PATH_TTL_MS) return hit;
  const file = await call<{ file_path?: string; file_size?: number }>("getFile", { file_id: fileId });
  const out = { at: Date.now(), path: file.file_path ?? "", size: file.file_size ?? 0 };
  if (paths.size > 20_000) paths.clear();
  paths.set(fileId, out);
  return out;
}

const toBody = (data: Buffer, type: string): FileBody => ({ body: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer, type });

async function download(fileId: string, types: Record<string, string>, max: number): Promise<FileBody> {
  const hit = files.get(fileId);
  if (hit) {
    files.delete(fileId);
    if (Date.now() - hit.at < FILE_TTL_MS) {
      files.set(fileId, hit); // back in at the young end
      return toBody(hit.data, hit.type);
    }
    cachedBytes -= hit.data.length; // expired: out now, so the count is subtracted once
  }
  let running = filesInflight.get(fileId);
  if (!running) {
    running = (async () => {
      const { path, size } = await filePath(fileId);
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      if (!FILE_PATH.test(path) || path.includes("..") || !types[ext]) throw new ResolverError("NO_PREVIEW", 404, "unsupported file");
      if (size > max) throw new ResolverError("TOO_LARGE", 413, "file too large");
      const { status, data } = await slot(() => telegram(`/file/bot${token()}/${path}`, null, max), filePool);
      if (status !== 200) {
        paths.delete(fileId);
        throw new ResolverError("TELEGRAM_ERROR", 502, `file download: HTTP ${status}`);
      }
      remember(fileId, data, types[ext]);
      return { data, type: types[ext] };
    })().finally(() => filesInflight.delete(fileId));
    filesInflight.set(fileId, running);
  }
  const { data, type } = await running;
  return toBody(data, type);
}

/** The preview picture of one emoji of a pack. Only emoji of that pack can be fetched. */
export async function previewFile(name: string, id: string): Promise<FileBody> {
  if (fixturesOn()) return fixturePreview(name, id) ?? missing("NO_PREVIEW", "this emoji has no picture");
  const s = await sticker(name, id);
  const fileId = s ? previewFileId(s) : null;
  if (!fileId) throw new ResolverError("NO_PREVIEW", 404, "this emoji has no picture");
  return download(fileId, TYPES, FILE_MAX);
}

/** The thumbnail of a video emoji: a still picture to show until it plays. */
export async function stillFile(name: string, id: string): Promise<FileBody> {
  if (fixturesOn()) return missing("NO_PREVIEW", "this emoji has no still picture");
  const s = await sticker(name, id);
  const fileId = s?.is_video ? s.thumbnail?.file_id : undefined;
  if (!fileId) throw new ResolverError("NO_PREVIEW", 404, "this emoji has no still picture");
  return download(fileId, TYPES, FILE_MAX);
}

/** The animation of an animated (TGS) emoji, as the gzip-compressed Lottie file Telegram stores. */
export async function animationFile(name: string, id: string): Promise<FileBody> {
  if (fixturesOn()) return fixtureAnimation(name, id) ?? missing("NO_ANIMATION", "this emoji is not an animated (TGS) emoji");
  const s = await sticker(name, id);
  if (!s?.is_animated || !s.file_id) throw new ResolverError("NO_ANIMATION", 404, "this emoji is not an animated (TGS) emoji");
  return download(s.file_id, ANIM_TYPES, ANIM_MAX);
}

// ------------------------------------------------------------------ per-client limit, errors

// A fixed window per key: two numbers per client instead of a list of timestamps.
const hits = new Map<string, { start: number; n: number }>();
export function allow(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  let w = hits.get(key);
  if (!w || now - w.start >= windowMs) {
    if (!w && hits.size > 20_000) hits.clear();
    w = { start: now, n: 0 };
    hits.set(key, w);
  }
  if (w.n >= limit) return false;
  w.n++;
  return true;
}

/** Proxied files have one canonical URL each, so the CDN serves repeats; a query string would make
 *  every request a new cache key that reaches the function. */
export function canonicalOnly(req: Request): void {
  if (new URL(req.url).search) throw new ResolverError("BAD_REQUEST", 400, "this URL takes no query string");
}

export function clientKey(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function errorResponse(err: unknown): Response {
  const e = err instanceof ResolverError ? err : new ResolverError("INTERNAL", 500, "resolver error");
  if (!(err instanceof ResolverError)) console.error("emoji resolver:", err instanceof Error ? err.name : "unknown error");
  // Short CDN cache for misses, so a burst for a wrong name does not reach Telegram each time.
  const cache = e.status === 404 || e.status === 400 || e.status === 422 ? "public, s-maxage=300" : "no-store";
  const headers: Record<string, string> = { "Cache-Control": cache, "X-Content-Type-Options": "nosniff" };
  if (e.retryAfter) headers["Retry-After"] = String(e.retryAfter);
  return Response.json({ ok: false, error: { code: e.code, message: e.message } }, { status: e.status, headers });
}
