// A stand-in for api.telegram.org, so the route handlers run their real resolver code with no network
// and no bot token. It replaces node:https request (the only way the resolver reaches Telegram) and
// answers from the committed catalog: every catalog pack exists with its real emoji ids. A few pack
// names act out Telegram's failures.
import { EventEmitter } from "node:events";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { catalogPacks } from "@/lib/emoji-facets";

export const FAKE_TOKEN = "123456:contract-test-token";
export const FAILING = {
  missing: "NoSuchPack", regular: "RegularStickers", broken: "TelegramBroken", silent: "TelegramSilent", huge: "HugeAnswer",
  outside: "UnlistedPack",
} as const;

type Format = "static" | "animated" | "video";
interface Sticker { file_id: string; custom_emoji_id: string; emoji: string; is_animated: boolean; is_video: boolean; needs_repainting: boolean; thumbnail?: { file_id: string } }

const packs = new Map(catalogPacks().map((p, i) => [p.name.toLowerCase(), { name: p.name, ids: p.emoji.map((e) => e.id), index: i }]));
const files = new Map<string, string>(); // file_id -> file_path
/** file_ids whose getFile answer has no file_path, as Telegram does for a file it cannot serve. */
export const pathless = new Set<string>();
const GLYPHS = ["✅", "🏠", "⭐", "🔔", "❤️", "🛒"];

/** The format of every emoji of a pack: checkified is animated and adaptive, as in Telegram; the rest rotate. */
export function formatOf(name: string): Format {
  if (name.toLowerCase() === "checkified") return "animated";
  return (["static", "animated", "video"] as const)[(packs.get(name.toLowerCase())?.index ?? 0) % 3];
}

function stickersOf(name: string, ids: string[]): Sticker[] {
  const format = formatOf(name);
  return ids.map((id, i) => {
    const ext = format === "static" ? "webp" : format === "animated" ? "tgs" : "webm";
    files.set(`F${id}`, `stickers/${id}.${ext}`);
    if (format !== "static") files.set(`T${id}`, `thumbnails/${id}.webp`);
    return {
      file_id: `F${id}`, custom_emoji_id: id, emoji: name.toLowerCase() === "checkified" ? "✅" : GLYPHS[i % GLYPHS.length],
      is_animated: format === "animated", is_video: format === "video", needs_repainting: name.toLowerCase() === "checkified",
      ...(format !== "static" && { thumbnail: { file_id: `T${id}` } }),
    };
  });
}

type Answer = { status: number; body: Buffer } | "hang-up";
const ok = (result: unknown): Answer => ({ status: 200, body: Buffer.from(JSON.stringify({ ok: true, result })) });
const fail = (status: number, description: string): Answer => ({ status, body: Buffer.from(JSON.stringify({ ok: false, error_code: status, description })) });

function getStickerSet(name: string): Answer {
  if (name === FAILING.missing) return fail(400, "Bad Request: STICKERSET_INVALID");
  if (name === FAILING.regular) return ok({ name, title: "Stickers", sticker_type: "regular", stickers: [] });
  if (name === FAILING.broken) return fail(500, "Internal Server Error");
  if (name === FAILING.silent) return "hang-up";
  if (name === FAILING.huge) return ok({ name, title: "x".repeat(3 * 1024 * 1024), sticker_type: "custom_emoji", stickers: [] });
  const pack = packs.get(name.toLowerCase());
  if (pack) return ok({ name: pack.name, title: `${pack.name} title`, sticker_type: "custom_emoji", stickers: stickersOf(pack.name, pack.ids) });
  if (name === FAILING.outside) return ok({ name, title: "Unlisted", sticker_type: "custom_emoji", stickers: stickersOf(name, ["9000000000000000001", "9000000000000000002"]) });
  return fail(400, "Bad Request: STICKERSET_INVALID");
}

const owners = new Map([...packs.values()].flatMap((p) => p.ids.map((id) => [id, p.name] as const)));

function getCustomEmojiStickers(ids: string[]): Answer {
  return ok(ids.flatMap((id) => (owners.has(id) ? [{ custom_emoji_id: id, set_name: owners.get(id), type: "custom_emoji" }] : [])));
}

function download(path: string): Answer {
  const ext = path.split(".").pop();
  if (ext === "tgs") return { status: 200, body: gzipSync(JSON.stringify({ tgs: 1, v: "5.5.2", fr: 60, ip: 0, op: 60, w: 512, h: 512, layers: [] })) };
  if (ext === "webm") return { status: 200, body: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]) };
  return { status: 200, body: Buffer.from("RIFF\0\0\0\0WEBPVP8 ") };
}

function answer(path: string, body: string): Answer {
  const file = /^\/file\/bot[^/]+\/(.+)$/.exec(path);
  if (file) return download(file[1]);
  const method = /^\/bot[^/]+\/(\w+)$/.exec(path)?.[1];
  const params = body ? JSON.parse(body) : {};
  if (method === "getStickerSet") return getStickerSet(params.name);
  if (method === "getCustomEmojiStickers") return getCustomEmojiStickers(params.custom_emoji_ids);
  if (method === "getFile") {
    if (pathless.has(params.file_id)) return ok({ file_id: params.file_id, file_size: 64 });
    const filePath = files.get(params.file_id);
    return filePath ? ok({ file_id: params.file_id, file_path: filePath, file_size: 64 }) : fail(400, "Bad Request: invalid file_id");
  }
  return fail(404, "Not Found");
}

/** Every request the fake answered: host and path, never a real token. */
export const calls: string[] = [];

/** Routes node:https request to the fake; returns a function that puts the real one back. */
export function installFakeTelegram(): () => void {
  const https = createRequire(import.meta.url)("node:https") as typeof import("node:https");
  const real = https.request;
  const fake = (options: { host?: string; path?: string }, callback: (res: Readable) => void) => {
    const req = new EventEmitter() as EventEmitter & { write(c: string): void; end(): void; destroy(): void };
    let sent = "";
    req.write = (chunk: string) => { sent += chunk; };
    req.destroy = () => {};
    req.end = () => setImmediate(() => {
      calls.push(`${options.host}${options.path}`);
      if (options.host !== "api.telegram.org") { req.emit("error", new Error("unexpected host")); return; }
      const a = answer(options.path ?? "", sent);
      if (a === "hang-up") { req.emit("error", new Error("socket hang up")); return; }
      const res = Object.assign(Readable.from([a.body]), { statusCode: a.status });
      callback(res);
    });
    return req;
  };
  https.request = fake as unknown as typeof https.request;
  syncBuiltinESMExports();
  return () => { https.request = real; syncBuiltinESMExports(); };
}
