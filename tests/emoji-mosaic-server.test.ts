// Pack creation on the mosaic page, with Telegram faked: the login hash, signed sessions and jobs, tiles added in
// order and never twice, and the mosaic message with the emoji behind each tile.
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { describe, test } from "node:test";
import { addTile, addTiles, type BotCall, checkTile, cleanEmoji, finishPack, MosaicError, newJob, PACK_TITLE, readJob, readSession, sessionCookie, verifyLogin } from "@/lib/emoji-mosaic-server";

const TOKEN = "123456:mosaic-test-token";
const CONFIG = { token: TOKEN, username: "MosaicMakerBot" };
const NOW = Date.UTC(2026, 10, 27, 12);
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3]);
const PASS = async () => ({ allowed: true, reason: "" });

function login(fields: Record<string, string | number>) {
  const check = Object.entries(fields).map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const hash = createHmac("sha256", createHash("sha256").update(TOKEN).digest()).update(check).digest("hex");
  return { ...fields, hash };
}

function fakeTelegram() {
  const sets = new Map<string, { custom_emoji_id: string; emoji: string }[]>();
  const calls: string[] = [];
  let sent: { chat_id: number; text: string; entities: unknown[] } | null = null;
  const call: BotCall = async (method, params) => {
    calls.push(method);
    if (method === "getStickerSet") {
      const s = sets.get(String(params.name));
      if (!s) throw new MosaicError(400, "TELEGRAM", "getStickerSet: Bad Request: STICKERSET_INVALID");
      return { sticker_type: "custom_emoji", stickers: s };
    }
    if (method === "uploadStickerFile") return { file_id: `f${calls.length}` };
    const stickerOf = (p: unknown) => p as { emoji_list: string[] };
    if (method === "createNewStickerSet") {
      sets.set(String(params.name), (params.stickers as unknown[]).map((st, i) => ({ custom_emoji_id: `50${i}`, emoji: stickerOf(st).emoji_list[0] })));
      return true;
    }
    if (method === "addStickerToSet") {
      const s = sets.get(String(params.name))!;
      s.push({ custom_emoji_id: `50${s.length}`, emoji: stickerOf(params.sticker).emoji_list[0] });
      return true;
    }
    if (method === "deleteStickerSet") {
      sets.delete(String(params.name));
      return true;
    }
    if (method === "sendMessage") {
      sent = params as typeof sent;
      return { message_id: 1, entities: params.entities };
    }
    throw new Error(method);
  };
  return { call, calls, sets, sent: () => sent };
}

describe("login and signed values", () => {
  test("a Login Widget answer signed with the bot token is accepted; a changed one is not", () => {
    const fields = { id: 42, first_name: "Ada", username: "ada", auth_date: Math.floor(NOW / 1000) - 60 };
    assert.deepEqual(verifyLogin(login(fields), TOKEN, NOW), { id: 42, name: "Ada" });
    assert.equal(verifyLogin({ ...login(fields), id: 43 }, TOKEN, NOW), null);
    assert.equal(verifyLogin(login({ ...fields, auth_date: Math.floor(NOW / 1000) - 3 * 86400 }), TOKEN, NOW), null);
    assert.equal(verifyLogin(login(fields), "999:other", NOW), null);
  });
  test("the session cookie round-trips and can't be forged", () => {
    const cookie = sessionCookie({ id: 42, name: "Ada" }, TOKEN, NOW).split(";")[0];
    assert.match(sessionCookie({ id: 42, name: "Ada" }, TOKEN, NOW), /HttpOnly; Secure; SameSite=Strict/);
    const req = (c: string) => new Request("https://example.test/api/mosaic/pack", { headers: { cookie: c } });
    assert.deepEqual(readSession(req(cookie), TOKEN, NOW), { id: 42, name: "Ada" });
    assert.equal(readSession(req(cookie.replace(/.$/, (ch) => (ch === "A" ? "B" : "A"))), TOKEN, NOW), null);
    assert.equal(readSession(req(cookie), TOKEN, NOW + 3 * 3600_000), null);
  });
  test("a job belongs to its visitor", () => {
    const { job, name } = newJob({ id: 42, name: "Ada" }, { count: 8, cols: 4, format: "video" }, CONFIG, NOW);
    assert.match(name, /^m16_[0-9a-f]{8}_by_mosaicmakerbot$/);
    const read = readJob(job, { id: 42, name: "Ada" }, TOKEN, NOW);
    assert.equal(read.title, PACK_TITLE);
    assert.equal(PACK_TITLE, "Mosaic image via @hlixli");
    assert.throws(() => readJob(job, { id: 7, name: "Eve" }, TOKEN, NOW), /isn't yours/);
    assert.throws(() => newJob({ id: 42, name: "Ada" }, { count: 101, cols: 1, format: "video" }, CONFIG, NOW), /1-100 tiles/);
    assert.throws(() => newJob({ id: 42, name: "Ada" }, { count: 8, cols: 3, format: "video" }, CONFIG, NOW), /doesn't divide/);
  });
  test("emoji are cleaned", () => {
    assert.equal(cleanEmoji("🌅"), "🌅");
    assert.equal(cleanEmoji("👍🏽"), "👍🏽");
    assert.equal(cleanEmoji("abc"), "⬜");
    assert.equal(cleanEmoji("<b>"), "⬜");
  });
});

describe("tiles and the message", () => {
  const user = { id: 42, name: "Ada" };
  test("tiles go in order, a retried tile is skipped, the message carries each tile's emoji", async () => {
    const tg = fakeTelegram();
    const job = readJob(newJob(user, { count: 4, cols: 2, format: "video" }, CONFIG, NOW).job, user, TOKEN, NOW);
    await assert.rejects(addTile(tg.call, job, 1, WEBM), /send tile 1 first/);
    assert.deepEqual(await addTile(tg.call, job, 0, WEBM, "🌅"), { added: true, have: 1 });
    assert.deepEqual(await addTile(tg.call, job, 0, WEBM, "🌅"), { added: false, have: 1 });
    for (const i of [1, 2, 3]) await addTile(tg.call, job, i, WEBM, i === 3 ? "not an emoji" : "🌿");
    assert.equal(tg.calls.filter((m) => m === "createNewStickerSet").length, 1);
    assert.equal(tg.calls.filter((m) => m === "addStickerToSet").length, 3);
    const done = await finishPack(tg.call, job, PASS);
    assert.equal(done.delivered, true);
    assert.equal(done.link, `https://t.me/addemoji/${job.name}`);
    assert.equal(tg.sent()!.text, "🌅🌿\n🌿⬜");
    assert.equal(tg.sent()!.chat_id, 42);
  });
  test("a run of tiles makes the set in one call, then adds the rest; a retried run adds nothing twice", async () => {
    const tg = fakeTelegram();
    const job = readJob(newJob(user, { count: 60, cols: 6, format: "video" }, CONFIG, NOW).job, user, TOKEN, NOW);
    const tiles = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => ({ index: from + i, data: WEBM, emoji: "🌿" }));
    assert.deepEqual(await addTiles(tg.call, job, tiles(0, 50)), { added: 50, have: 50 });
    assert.equal(tg.calls.filter((m) => m === "createNewStickerSet").length, 1);
    assert.equal(tg.calls.filter((m) => m === "addStickerToSet").length, 0);
    assert.equal(tg.calls.filter((m) => m === "getStickerSet").length, 1);
    await assert.rejects(addTiles(tg.call, job, tiles(51, 55)), /send tile 51 first/);
    assert.deepEqual(await addTiles(tg.call, job, tiles(45, 60)), { added: 10, have: 60 });
    assert.equal(tg.calls.filter((m) => m === "addStickerToSet").length, 10);
    assert.deepEqual(await addTiles(tg.call, job, tiles(50, 60)), { added: 0, have: 60 });
    assert.equal(tg.sets.get(job.name)!.length, 60);
    await assert.rejects(addTiles(tg.call, job, [...tiles(0, 2), ...tiles(3, 4)]), /unbroken run/);
  });
  test("a tile Telegram refuses is named with its size", async () => {
    const tg = fakeTelegram();
    const job = readJob(newJob(user, { count: 2, cols: 2, format: "video" }, CONFIG, NOW).job, user, TOKEN, NOW);
    const refuse: BotCall = async (method, params, file) => {
      if (method === "addStickerToSet") throw new MosaicError(400, "TELEGRAM", "addStickerToSet: Bad Request: STICKER_VIDEO_BIG");
      return tg.call(method, params, file);
    };
    await addTile(refuse, job, 0, WEBM);
    await assert.rejects(addTile(refuse, job, 1, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(2044).fill(0)])),
      (err: unknown) => err instanceof MosaicError && err.code === "TILE_REFUSED" && /tile 2 \(2 KB\)/.test(err.message));
  });
  test("an unfinished set isn't sent", async () => {
    const tg = fakeTelegram();
    const job = readJob(newJob(user, { count: 4, cols: 2, format: "video" }, CONFIG, NOW).job, user, TOKEN, NOW);
    await addTile(tg.call, job, 0, WEBM);
    await assert.rejects(finishPack(tg.call, job, PASS), /holds 1 of 4/);
  });
  test("a set the content check refuses is deleted and never sent", async () => {
    const tg = fakeTelegram();
    const job = readJob(newJob(user, { count: 2, cols: 2, format: "video" }, CONFIG, NOW).job, user, TOKEN, NOW);
    for (const i of [0, 1]) await addTile(tg.call, job, i, WEBM);
    await assert.rejects(finishPack(tg.call, job, async () => ({ allowed: false, reason: "Graphic violence.", categories: ["violence_gore"] })), (err: unknown) => err instanceof MosaicError && err.status === 422 && /Graphic violence/.test(err.message));
    assert.equal(tg.sets.has(job.name), false);
    assert.equal(tg.sent(), null);
  });
  test("a check that can't run fails closed", async () => {
    const tg = fakeTelegram();
    const job = readJob(newJob(user, { count: 2, cols: 2, format: "video" }, CONFIG, NOW).job, user, TOKEN, NOW);
    for (const i of [0, 1]) await addTile(tg.call, job, i, WEBM);
    await assert.rejects(finishPack(tg.call, job, async () => { throw new Error("network"); }), (err: unknown) => err instanceof MosaicError && err.status === 503);
    assert.equal(tg.sets.has(job.name), false);
    assert.equal(tg.sent(), null);
  });
  test("tile files are checked before they reach Telegram", () => {
    assert.equal(checkTile(WEBM, "video"), "video/webm");
    assert.throws(() => checkTile(new Uint8Array(300 * 1024).fill(0x1a), "video"), /256 KB/);
    assert.throws(() => checkTile(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "video"), /WEBM/);
    assert.throws(() => checkTile(WEBM, "static"), /100x100 PNG/);
  });
});
