// Premium emoji pack resolver for bot-ui Studio: reads a public custom emoji set with the
// site's own bot, so a Studio user only sends the pack name and never needs a bot token.
//
// The token (EMOJI_RESOLVER_BOT_TOKEN) is read on the server only, sent only to
// api.telegram.org, never logged, never returned, and never part of a cache key. Only the
// read-only methods getStickerSet and getFile are called; nothing is sent to any chat, so a
// bot that already runs with the same token (polling or webhook) is not affected.
import "server-only";
import { cacheLife } from "next/cache";

const API = "https://api.telegram.org";
export const PACK_NAME = /^[A-Za-z0-9_]{1,64}$/;
export const EMOJI_ID = /^\d{1,20}$/;
const FILE_PATH = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*$/;
const PACK_MAX = 200;
export const FILE_MAX = 512 * 1024;
const TIMEOUT_MS = 10_000;

export type Format = "static" | "animated" | "video";
export interface PackEmoji { id: string; fallback: string; format: Format; adaptive: boolean; preview: string | null }
export interface Pack { name: string; title: string; emoji: PackEmoji[] }

interface Sticker {
  file_id?: string; custom_emoji_id?: string; emoji?: string; is_animated?: boolean; is_video?: boolean;
  needs_repainting?: boolean; thumbnail?: { file_id?: string };
}
interface StickerSet { name: string; title?: string; sticker_type?: string; stickers?: Sticker[] }

export class ResolverError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message);
  }
}

function token(): string {
  const t = process.env.EMOJI_RESOLVER_BOT_TOKEN;
  if (!t) throw new ResolverError("RESOLVER_OFF", 503, "the emoji resolver is not configured");
  return t;
}

/** One read-only Bot API call. Errors carry Telegram's description, never the request URL. */
async function call<T>(method: "getStickerSet" | "getFile", params: Record<string, string>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/bot${token()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof ResolverError) throw err;
    throw new ResolverError("TELEGRAM_UNREACHABLE", 502, "Telegram did not answer");
  }
  const doc = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (doc.ok) return doc.result as T;
  const desc = String(doc.description ?? `HTTP ${res.status}`);
  if (/STICKERSET_INVALID|not found/i.test(desc)) throw new ResolverError("PACK_NOT_FOUND", 404, "no such pack");
  if (res.status === 429) throw new ResolverError("RATE_LIMITED", 429, "Telegram asks to slow down; retry in a minute");
  throw new ResolverError("TELEGRAM_ERROR", 502, `${method}: ${desc}`.slice(0, 200));
}

/** The raw set, cached per name (the token is not an argument, so it is not in the key).
 * Errors are not cached; they cross the cache boundary as plain Errors, so the code travels
 * in the message and `stickerSet` turns it back into a ResolverError. */
async function cachedStickerSet(name: string): Promise<StickerSet> {
  "use cache";
  cacheLife("hours");
  try {
    return await call<StickerSet>("getStickerSet", { name });
  } catch (err) {
    const e = err instanceof ResolverError ? err : new ResolverError("TELEGRAM_ERROR", 502, "getStickerSet failed");
    throw new Error(JSON.stringify({ code: e.code, status: e.status, message: e.message }));
  }
}

async function stickerSet(name: string): Promise<StickerSet> {
  try {
    return await cachedStickerSet(name);
  } catch (err) {
    let e: { code?: string; status?: number; message?: string } = {};
    try { e = JSON.parse(err instanceof Error ? err.message : ""); } catch { /* not ours */ }
    throw new ResolverError(e.code ?? "TELEGRAM_ERROR", e.status ?? 502, e.message ?? "getStickerSet failed");
  }
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
      fallback: s.emoji ?? "",
      format: s.is_video ? "video" : s.is_animated ? "animated" : "static",
      adaptive: !!s.needs_repainting,
      preview: previewFileId(s) ? `/api/emoji-pack/${set.name}/${s.custom_emoji_id}` : null,
    });
  }
  return { name: set.name, title: set.title ?? set.name, emoji };
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
  let res: Response;
  try {
    res = await fetch(`${API}/file/bot${token()}/${path}`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ResolverError("TELEGRAM_UNREACHABLE", 502, "Telegram did not answer");
  }
  if (!res.ok) throw new ResolverError("TELEGRAM_ERROR", 502, `file download: HTTP ${res.status}`);
  const body = await res.arrayBuffer();
  if (body.byteLength > FILE_MAX) throw new ResolverError("TOO_LARGE", 413, "picture too large");
  return { body, type: TYPES[ext] };
}

// Best-effort limit per instance on uncached work (the CDN answers repeated requests).
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
  return Response.json({ ok: false, error: { code: e.code, message: e.message } }, {
    status: e.status, headers: { "Cache-Control": cache, "X-Content-Type-Options": "nosniff" },
  });
}
