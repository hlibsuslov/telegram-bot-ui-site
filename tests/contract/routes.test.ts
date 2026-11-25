// Every route handler, called directly, answers what the OpenAPI document says: the documented
// status, media type and headers, a body that matches the schema with no undocumented field, and
// errors with the documented status and code. Telegram is faked (./telegram.ts); the catalog is real.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { gunzipSync } from "node:zlib";
import { RATE_LIMITS } from "@/lib/emoji-api-contract";
import { catalogExport } from "@/lib/emoji-export";
import { catalogPacks, catalogVersion } from "@/lib/emoji-facets";
import { openApiDocument } from "@/lib/emoji-openapi";
import { validate } from "./schema";
import { FAILING, FAKE_TOKEN, formatOf, installFakeTelegram, pathless } from "./telegram";

process.env.EMOJI_RESOLVER_BOT_TOKEN = FAKE_TOKEN;
delete process.env.EMOJI_RESOLVER_FIXTURES;

const search = await import("@/app/api/emoji-search/route");
const facets = await import("@/app/api/emoji-facets/route");
const byId = await import("@/app/api/emoji-pack/by-id/route");
const pack = await import("@/app/api/emoji-pack/[name]/route");
const picture = await import("@/app/api/emoji-pack/[name]/[id]/route");
const still = await import("@/app/api/emoji-pack/[name]/[id]/still/route");
const anim = await import("@/app/api/emoji-pack/[name]/[id]/anim/route");
const openapi = await import("@/app/api/emoji-openapi.json/route");
const exported = await import("@/app/emoji-library.ndjson.gz/route");
const llms = await import("@/app/llms.txt/route");

type Obj = Record<string, unknown>;
type Documented = { description: string; headers?: Record<string, { schema: Obj }>; content?: Record<string, { schema?: Obj }> };
const doc = openApiDocument("http://localhost:3000") as unknown as { paths: Record<string, { get: { responses: Record<string, Documented> } }> };

let restore = () => {};
before(() => { restore = installFakeTelegram(); });
after(() => restore());

// Every test is its own client, so the per-client limits of one test never touch another.
let clients = 0;
const client = () => `198.51.100.${++clients}`;
const request = (url: string, ip = client()) => new Request(`http://localhost:3000${url}`, { headers: { "x-real-ip": ip } });
const params = <T extends Obj>(p: T) => ({ params: Promise.resolve(p) });

/** Checks a response against the document and returns its body (JSON, or the bytes of a file). */
async function documented(path: string, res: Response, status: number, code?: string): Promise<{ json?: Obj & { error?: { code: string } }; bytes?: Buffer }> {
  const op = doc.paths[path]?.get;
  assert.ok(op, `${path} is not in the document`);
  assert.equal(res.status, status, `${path}: status`);
  const spec = op.responses[String(res.status)];
  assert.ok(spec, `${path}: ${res.status} is not documented`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const media = spec.content?.[type];
  assert.ok(media, `${path} ${res.status}: ${type || "no content type"} is not documented`);
  for (const [name, header] of Object.entries(spec.headers ?? {})) {
    if (header.schema.const !== undefined) assert.equal(res.headers.get(name), String(header.schema.const), `${path}: ${name} header`);
  }
  if (type !== "application/json") return { bytes: Buffer.from(await res.arrayBuffer()) };
  const json = await res.json();
  assert.ok(media.schema, `${path} ${res.status}: no schema`);
  assert.deepEqual(validate(json, media.schema, doc), [], `${path} ${res.status}: body does not match the schema`);
  if (code) assert.equal(json.error?.code, code, `${path}: error code`);
  return { json };
}

/** Calls a handler `limit` times as one client, then once more: that one must be 429 RATE_LIMITED. */
async function overTheLimit(path: string, limit: number, call: (ip: string) => Promise<Response>) {
  const ip = client();
  for (let i = 0; i < limit; i++) assert.notEqual((await call(ip)).status, 429, `${path}: limited after ${i} requests, documented ${limit}`);
  const res = await call(ip);
  await documented(path, res, 429, "RATE_LIMITED");
  return res;
}

const checkified = catalogPacks().find((p) => p.name === "checkified")!;
const staticPack = catalogPacks().find((p) => formatOf(p.name) === "static")!;
const videoPack = catalogPacks().find((p) => formatOf(p.name) === "video")!;
const PACK = "/api/emoji-pack/{name}";
const PICTURE = "/api/emoji-pack/{name}/{id}";
const STILL = "/api/emoji-pack/{name}/{id}/still";
const ANIM = "/api/emoji-pack/{name}/{id}/anim";

describe("GET /api/emoji-search", () => {
  const path = "/api/emoji-search";
  test("a facet filter over the whole catalog", async () => {
    const { json } = await documented(path, await search.GET(request("/api/emoji-search?q=style%3Aoutline")), 200);
    assert.deepEqual(json!.filters, ["style:outline"]);
    assert.ok((json!.total as number) > 0, "no outline emoji found");
    assert.equal(json!.taxonomy, catalogVersion.taxonomy);
    assert.equal(json!.generated, catalogVersion.generated);
  });
  test("words within one pack, and an unknown filter value", async () => {
    const { json } = await documented(path, await search.GET(request("/api/emoji-search?q=check%20style%3Anosuch&pack=checkified")), 200);
    assert.deepEqual(json!.unknownFilters, ["style:nosuch"]);
    assert.ok((json!.emoji as Obj[]).every((e) => e.pack === "checkified"));
  });
  test("a blank query answers empty, with the version", async () => {
    const { json } = await documented(path, await search.GET(request("/api/emoji-search?q=")), 200);
    assert.equal(json!.total, 0);
  });
  test(`limit: ${RATE_LIMITS.search} a minute`, async () => {
    const res = await overTheLimit(path, RATE_LIMITS.search, (ip) => search.GET(request("/api/emoji-search", ip)));
    assert.equal(res.headers.get("retry-after"), "60");
  });
});

describe("GET /api/emoji-facets", () => {
  const path = "/api/emoji-facets";
  test("the taxonomy and every pack, with look", async () => {
    const { json } = await documented(path, await facets.GET(request(path)), 200);
    assert.equal((json!.packs as Obj[]).length, catalogPacks().length);
    assert.equal((json!.taxonomy as Obj).version, catalogVersion.taxonomy);
    assert.ok((json!.packs as Obj[]).every((p) => p.look), "a pack without look");
  });
  test(`limit: ${RATE_LIMITS.facets} a minute`, async () => {
    await overTheLimit(path, RATE_LIMITS.facets, (ip) => facets.GET(request(path, ip)));
  });
});

describe("GET /api/emoji-pack/{name}", () => {
  const get = (name: string, ip?: string) => pack.GET(request(`/api/emoji-pack/${name}`, ip), params({ name }));
  test("a catalog pack: emoji with facets, look, compatible packs, version", async () => {
    const { json } = await documented(PACK, await get("checkified"), 200);
    assert.equal((json!.emoji as Obj[]).length, checkified.emoji.length);
    assert.ok(json!.facets && json!.look && json!.pageUrl);
    assert.equal(json!.taxonomy, catalogVersion.taxonomy);
  });
  test("a pack outside the catalog: no tags, no page", async () => {
    const { json } = await documented(PACK, await get(FAILING.outside), 200);
    assert.equal(json!.facets, null);
    assert.equal(json!.pageUrl, null);
    assert.ok(!("look" in json!));
  });
  test("400 PACK_NAME", async () => { await documented(PACK, await get("bad-name"), 400, "PACK_NAME"); });
  test("404 PACK_NOT_FOUND", async () => { await documented(PACK, await get(FAILING.missing), 404, "PACK_NOT_FOUND"); });
  test("422 NOT_EMOJI_PACK", async () => { await documented(PACK, await get(FAILING.regular), 422, "NOT_EMOJI_PACK"); });
  test("413 TOO_LARGE", async () => { await documented(PACK, await get(FAILING.huge), 413, "TOO_LARGE"); });
  test("502 TELEGRAM_ERROR", async () => { await documented(PACK, await get(FAILING.broken), 502, "TELEGRAM_ERROR"); });
  test("502 TELEGRAM_UNREACHABLE", async () => { await documented(PACK, await get(FAILING.silent), 502, "TELEGRAM_UNREACHABLE"); });
  test("503 RESOLVER_OFF without a token", async () => {
    delete process.env.EMOJI_RESOLVER_BOT_TOKEN;
    try {
      await documented(PACK, await get("NeverReadBefore"), 503, "RESOLVER_OFF");
    } finally {
      process.env.EMOJI_RESOLVER_BOT_TOKEN = FAKE_TOKEN;
    }
  });
  test(`limit: ${RATE_LIMITS.pack} a minute`, async () => {
    const res = await overTheLimit(PACK, RATE_LIMITS.pack, (ip) => get("checkified", ip));
    assert.equal(res.headers.get("retry-after"), "60");
  });
});

describe("GET /api/emoji-pack/by-id", () => {
  const path = "/api/emoji-pack/by-id";
  test("known ids get their pack, unknown ids are left out", async () => {
    const ids = [checkified.emoji[0].id, staticPack.emoji[0].id, "1"];
    const { json } = await documented(path, await byId.GET(request(`${path}?ids=${ids.join(",")}`)), 200);
    assert.deepEqual((json!.emoji as Obj[]).map((e) => e.set), ["checkified", staticPack.name]);
  });
  test("400 BAD_REQUEST: not digits", async () => { await documented(path, await byId.GET(request(`${path}?ids=bad`)), 400, "BAD_REQUEST"); });
  test("400 BAD_REQUEST: more than 200 ids", async () => {
    const ids = Array.from({ length: 201 }, (_, i) => String(i + 1)).join(",");
    await documented(path, await byId.GET(request(`${path}?ids=${ids}`)), 400, "BAD_REQUEST");
  });
  test(`limit: ${RATE_LIMITS.ids} a minute`, async () => {
    await overTheLimit(path, RATE_LIMITS.ids, (ip) => byId.GET(request(`${path}?ids=${checkified.emoji[0].id}`, ip)));
  });
});

describe("GET /api/emoji-pack/{name}/{id} and its still and anim", () => {
  type FileRoute = { GET(req: Request, ctx: { params: Promise<{ name: string; id: string }> }): Promise<Response> };
  const file = (route: FileRoute, name: string, id: string, suffix = "", query = "", ip?: string) =>
    route.GET(request(`/api/emoji-pack/${name}/${id}${suffix}${query}`, ip), params({ name, id }));
  test("the picture of a static emoji", async () => {
    const { bytes } = await documented(PICTURE, await file(picture, staticPack.name, staticPack.emoji[0].id), 200);
    assert.ok(bytes!.length > 0);
  });
  test("the still of a video emoji", async () => {
    await documented(STILL, await file(still, videoPack.name, videoPack.emoji[0].id, "/still"), 200);
  });
  test("the TGS of an animated emoji is gzip Lottie", async () => {
    const { bytes } = await documented(ANIM, await file(anim, "checkified", checkified.emoji[0].id, "/anim"), 200);
    assert.equal(JSON.parse(gunzipSync(bytes!).toString()).tgs, 1);
  });
  test("400 BAD_REQUEST: a query string", async () => {
    await documented(PICTURE, await file(picture, staticPack.name, staticPack.emoji[0].id, "", "?v=2"), 400, "BAD_REQUEST");
  });
  test("400 BAD_REQUEST: a malformed id", async () => {
    await documented(PICTURE, await file(picture, staticPack.name, "12ab"), 400, "BAD_REQUEST");
  });
  test("404 PACK_NOT_FOUND", async () => { await documented(PICTURE, await file(picture, FAILING.missing, "1"), 404, "PACK_NOT_FOUND"); });
  test("404 NO_PREVIEW: an emoji of another pack", async () => {
    await documented(PICTURE, await file(picture, staticPack.name, checkified.emoji[0].id), 404, "NO_PREVIEW");
  });
  test("404 NO_PREVIEW: the still of a static emoji", async () => {
    await documented(STILL, await file(still, staticPack.name, staticPack.emoji[0].id, "/still"), 404, "NO_PREVIEW");
  });
  test("404 NO_ANIMATION: Telegram gives no file path for an animated emoji", async () => {
    const pack = catalogPacks().find((p) => formatOf(p.name) === "animated" && p.name.toLowerCase() !== "checkified")!;
    pathless.add(`F${pack.emoji[0].id}`);
    await documented(ANIM, await file(anim, pack.name, pack.emoji[0].id, "/anim"), 404, "NO_ANIMATION");
  });
  test("404 NO_ANIMATION: the animation of a static emoji", async () => {
    await documented(ANIM, await file(anim, staticPack.name, staticPack.emoji[0].id, "/anim"), 404, "NO_ANIMATION");
  });
  test(`limits: pictures ${RATE_LIMITS.file}, animations ${RATE_LIMITS.anim} a minute`, async () => {
    await overTheLimit(PICTURE, RATE_LIMITS.file, (ip) => file(picture, staticPack.name, staticPack.emoji[0].id, "", "", ip));
    await overTheLimit(ANIM, RATE_LIMITS.anim, (ip) => file(anim, "checkified", checkified.emoji[0].id, "/anim", "", ip));
  });
});

describe("GET /api/emoji-openapi.json", () => {
  test("serves the document", async () => {
    const { json } = await documented("/api/emoji-openapi.json", openapi.GET(), 200);
    assert.equal(json!.openapi, "3.1.0");
    assert.deepEqual(Object.keys(json!.paths as Obj), Object.keys(doc.paths));
  });
});

describe("GET /emoji-library.ndjson.gz", () => {
  const path = "/emoji-library.ndjson.gz";
  const schema = { $ref: "#/components/schemas/CatalogLine" };
  test("the documented bytes, ETag and size; one valid line per catalog pack", async () => {
    const res = exported.GET();
    const { bytes } = await documented(path, res, 200);
    const file = catalogExport();
    assert.equal(bytes!.length, file.bytes);
    assert.equal(res.headers.get("etag"), file.etag);
    const lines = gunzipSync(bytes!).toString("utf8").trimEnd().split("\n").map((l) => JSON.parse(l) as Obj);
    assert.equal(lines.length, catalogPacks().length);
    for (const line of lines) assert.deepEqual(validate(line, schema, doc), [], `line ${line.name}`);
    assert.equal(new Set(lines.map((l) => l.name)).size, lines.length, "a pack appears twice");
    const ids = lines.reduce((n, l) => n + (l.emoji as unknown[]).length, 0);
    assert.equal(ids, catalogPacks().reduce((n, p) => n + p.emoji.length, 0));
  });
});

describe("GET /llms.txt", () => {
  test("tells agents about the contract, the export and the limits", async () => {
    const text = await llms.GET().text();
    const file = catalogExport();
    for (const part of ["/api/emoji-openapi.json", "/emoji-library.ndjson.gz", String(file.bytes), file.etag, "facet:value", "compatible",
      ...Object.values(RATE_LIMITS).map(String)]) {
      assert.ok(text.includes(part), `llms.txt does not mention ${part}`);
    }
  });
});
