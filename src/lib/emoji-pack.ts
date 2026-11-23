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
// runs at most MAX_CONCURRENT Telegram calls at a time, and stops calling Telegram while a 429
// retry_after is running.
import "server-only";
import { request } from "node:https";

export const PACK_NAME = /^[A-Za-z0-9_]{1,64}$/;
export const EMOJI_ID = /^\d{1,20}$/;
const FILE_PATH = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*$/;
const PACK_MAX = 200;
export const FILE_MAX = 512 * 1024;
const JSON_MAX = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const SET_TTL_MS = 60 * 60 * 1000;
const SET_CACHE_MAX = 500;
const MAX_CONCURRENT = 4;

export type Format = "static" | "animated" | "video";
export interface PackEmoji { id: string; fallback: string; format: Format; adaptive: boolean; preview: string | null }
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

function token(): string {
  const t = process.env.EMOJI_RESOLVER_BOT_TOKEN?.trim();
  if (!t) throw new ResolverError("RESOLVER_OFF", 503, "the emoji resolver is not configured");
  return t;
}

// ------------------------------------------------------------------ Telegram, bounded

let active = 0;
const waiting: (() => void)[] = [];
let pausedUntil = 0;

async function slot<T>(work: () => Promise<T>): Promise<T> {
  if (Date.now() < pausedUntil) {
    const wait = Math.ceil((pausedUntil - Date.now()) / 1000);
    throw new ResolverError("RATE_LIMITED", 429, "busy; retry in a moment", wait);
  }
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await work();
  } finally {
    active--;
    waiting.shift()?.();
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

/** The raw set: an hour in memory for successes; errors are never kept. */
async function stickerSet(name: string): Promise<StickerSet> {
  const hit = sets.get(name);
  if (hit && Date.now() - hit.at < SET_TTL_MS) return hit.set;
  const running = inflight.get(name);
  if (running) return running;
  const p = call<StickerSet>("getStickerSet", { name })
    .then((set) => {
      if (sets.size >= SET_CACHE_MAX) sets.delete(sets.keys().next().value as string);
      sets.set(name, { at: Date.now(), set });
      return set;
    })
    .finally(() => inflight.delete(name));
  inflight.set(name, p);
  return p;
}

function previewFileId(s: Sticker): string | null {
  if (s.is_animated) return s.thumbnail?.file_id ?? null; // TGS: the static thumbnail
  return s.file_id ?? null; // WEBP or WEBM
}

export async function resolvePack(name: string): Promise<Pack> {
  if (!PACK_NAME.test(name)) throw new ResolverError("PACK_NAME", 400, "a pack name is letters, digits and _");
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
      preview: previewFileId(s) ? `/api/emoji-pack/${set.name}/${s.custom_emoji_id}` : null,
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
  if (ask.length) {
    const stickers = await call<{ custom_emoji_id?: string; set_name?: string }[]>("getCustomEmojiStickers", { custom_emoji_ids: ask });
    const found = new Map<string, string>();
    for (const s of Array.isArray(stickers) ? stickers : []) {
      if (s.custom_emoji_id && s.set_name && PACK_NAME.test(s.set_name)) found.set(s.custom_emoji_id, s.set_name);
    }
    if (owners.size + ask.length > OWNER_CACHE_MAX) owners.clear();
    for (const id of ask) owners.set(id, { at: now, set: found.get(id) ?? null });
  }
  return ids.flatMap((id) => { const set = owners.get(id)?.set; return set ? [{ id, set }] : []; });
}

const TYPES: Record<string, string> = { webp: "image/webp", webm: "video/webm", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

/** The preview picture of one emoji of a pack. Only emoji of that pack can be fetched. */
export async function previewFile(name: string, id: string): Promise<{ body: ArrayBuffer; type: string }> {
  if (!PACK_NAME.test(name) || !EMOJI_ID.test(id)) throw new ResolverError("BAD_REQUEST", 400, "bad pack name or emoji id");
  const set = await stickerSet(name);
  const sticker = set.sticker_type === "custom_emoji" ? set.stickers?.find((s) => s.custom_emoji_id === id) : undefined;
  const fileId = sticker ? previewFileId(sticker) : null;
  if (!fileId) throw new ResolverError("NO_PREVIEW", 404, "this emoji has no picture");
  const file = await call<{ file_path?: string; file_size?: number }>("getFile", { file_id: fileId });
  const path = file.file_path ?? "";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (!FILE_PATH.test(path) || path.includes("..") || !TYPES[ext]) throw new ResolverError("NO_PREVIEW", 404, "unsupported picture");
  if ((file.file_size ?? 0) > FILE_MAX) throw new ResolverError("TOO_LARGE", 413, "picture too large");
  const { status, data } = await slot(() => telegram(`/file/bot${token()}/${path}`, null, FILE_MAX));
  if (status !== 200) throw new ResolverError("TELEGRAM_ERROR", 502, `file download: HTTP ${status}`);
  return { body: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer, type: TYPES[ext] };
}

// ------------------------------------------------------------------ per-client limit, errors

const hits = new Map<string, number[]>();
export function allow(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
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
