// POST /api/mcp: the MCP protocol over Streamable HTTP (initialize, tools/list, tools/call, errors),
// and every tool that has an HTTP twin answers exactly what that route answers for the same input.
// The route handler runs unchanged; Telegram is faked (./telegram.ts), the catalog is real.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { RATE_LIMITS } from "@/lib/emoji-api-contract";
import { catalogPacks, catalogVersion } from "@/lib/emoji-facets";
import { MCP_RESPONSE_MAX } from "@/lib/emoji-mcp";
import { openApiDocument } from "@/lib/emoji-openapi";
import { rankPacks } from "@/lib/emoji-pick";
import { SLOT_NAMES } from "@/lib/emoji-slots";
import { validate } from "./schema";
import { FAILING, FAKE_TOKEN, installFakeTelegram } from "./telegram";

process.env.EMOJI_RESOLVER_BOT_TOKEN = FAKE_TOKEN;
delete process.env.EMOJI_RESOLVER_FIXTURES;

const mcp = await import("@/app/api/mcp/route");
const search = await import("@/app/api/emoji-search/route");
const facets = await import("@/app/api/emoji-facets/route");
const byId = await import("@/app/api/emoji-pack/by-id/route");
const pack = await import("@/app/api/emoji-pack/[name]/route");

type Obj = Record<string, unknown>;
interface Rpc { status: number; headers: Headers; bytes: number; body: { jsonrpc?: string; id?: unknown; result?: Obj; error?: { code: number; message: string } } | null }
interface ToolResult { isError?: boolean; content: { type: string; text: string }[] }

let restore = () => {};
before(() => { restore = installFakeTelegram(); });
after(() => restore());

let clients = 0;
const client = () => `203.0.113.${++clients}`;
const HEADERS = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };

async function post(body: unknown, { ip = client(), headers = {} as Record<string, string> } = {}): Promise<Rpc> {
  const req = new Request("http://localhost:3000/api/mcp", {
    method: "POST", headers: { ...HEADERS, "x-real-ip": ip, ...headers }, body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const res = await mcp.POST(req);
  const text = await res.text();
  return { status: res.status, headers: res.headers, bytes: Buffer.byteLength(text), body: text ? JSON.parse(text) : null };
}

let ids = 0;
const call = (name: string, args: Obj, ip?: string) =>
  post({ jsonrpc: "2.0", id: ++ids, method: "tools/call", params: { name, arguments: args } }, { ip, headers: { "Mcp-Protocol-Version": "2025-11-25" } });

/** A tool call that must succeed: its parsed JSON answer, after checking the size limit. */
async function tool(name: string, args: Obj, ip?: string): Promise<Obj> {
  const res = await call(name, args, ip);
  assert.equal(res.status, 200);
  assert.ok(res.bytes <= MCP_RESPONSE_MAX, `${name}: ${res.bytes} bytes`);
  const result = res.body!.result as unknown as ToolResult;
  assert.ok(!result.isError, `${name}: ${result.content[0]?.text}`);
  return JSON.parse(result.content[0].text);
}

async function toolError(name: string, args: Obj, ip?: string): Promise<{ text: string; json?: Obj & { error?: { code: string } } }> {
  const res = await call(name, args, ip);
  assert.equal(res.status, 200, `${name}: a tool error is an HTTP 200 JSON-RPC result`);
  const result = res.body!.result as unknown as ToolResult;
  assert.equal(result.isError, true, `${name}: expected isError`);
  const text = result.content[0].text;
  try { return { text, json: JSON.parse(text) }; } catch { return { text }; }
}

const request = (url: string, ip = client()) => new Request(`http://localhost:3000${url}`, { headers: { "x-real-ip": ip } });
const httpJson = async (res: Response | Promise<Response>) => (await res).json() as Promise<Obj>;
const params = <T extends Obj>(p: T) => ({ params: Promise.resolve(p) });
const checkified = catalogPacks().find((p) => p.name === "checkified")!;
const other = catalogPacks().find((p) => p.name !== "checkified" && p.emoji.length >= 6)!;

describe("MCP protocol", () => {
  test("initialize: 2025-11-25, tools, server info and instructions; no session", async () => {
    const res = await post({ jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "contract-test", version: "1" } } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /^application\/json/);
    assert.equal(res.headers.get("mcp-session-id"), null);
    const r = res.body!.result!;
    assert.equal(r.protocolVersion, "2025-11-25");
    assert.ok((r.capabilities as Obj).tools);
    assert.equal((r.serverInfo as Obj).name, "telegram-emoji-library");
    assert.match(String(r.instructions), /custom/);
  });
  test("initialize: an older client keeps its revision, an unknown one gets the latest", async () => {
    for (const v of ["2025-06-18", "2025-03-26", "2024-11-05"]) {
      const res = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: v, capabilities: {}, clientInfo: { name: "old", version: "1" } } });
      assert.equal(res.body!.result!.protocolVersion, v);
    }
    const res = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "1999-01-01", capabilities: {}, clientInfo: { name: "x", version: "1" } } });
    assert.equal(res.body!.result!.protocolVersion, "2025-11-25");
  });
  test("a notification is accepted with 202 and no body", async () => {
    const res = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    assert.equal(res.status, 202);
    assert.equal(res.body, null);
  });
  test("tools/list: six read-only tools with strict input schemas", async () => {
    const res = await post({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = (res.body!.result!.tools as { name: string; inputSchema: Obj; annotations: Obj }[]);
    assert.deepEqual(tools.map((t) => t.name).sort(),
      ["emoji_by_id", "emoji_facets", "emoji_pack", "emoji_pick_family", "emoji_rank_packs", "emoji_search"]);
    for (const t of tools) {
      assert.equal(t.inputSchema.type, "object", t.name);
      assert.equal(t.inputSchema.additionalProperties, false, `${t.name}: extra arguments must be refused`);
      assert.equal(t.annotations.readOnlyHint, true, t.name);
      assert.equal(t.annotations.destructiveHint, false, t.name);
    }
    const pick = tools.find((t) => t.name === "emoji_pick_family")!;
    assert.deepEqual(((pick.inputSchema.properties as Obj).slots as { items: { enum: string[] } }).items.enum, SLOT_NAMES);
  });
  test("unknown method: JSON-RPC -32601", async () => {
    const res = await post({ jsonrpc: "2.0", id: 3, method: "resources/nosuch" });
    assert.equal(res.status, 200);
    assert.equal(res.body!.error!.code, -32601);
  });
  test("not JSON: 400 with JSON-RPC -32700", async () => {
    const res = await post("{nope");
    assert.equal(res.status, 400);
    assert.equal(res.body!.error!.code, -32700);
  });
  test("an unsupported protocol header: 400", async () => {
    const res = await post({ jsonrpc: "2.0", id: 4, method: "tools/list" }, { headers: { "Mcp-Protocol-Version": "1999-01-01" } });
    assert.equal(res.status, 400);
  });
  test("GET and DELETE: 405, POST only", async () => {
    for (const handler of [mcp.GET, mcp.DELETE]) {
      const res = await handler();
      assert.equal(res.status, 405);
      assert.equal(res.headers.get("allow"), "POST");
    }
  });
  test("a body over 64 KB: 413", async () => {
    const res = await post({ jsonrpc: "2.0", id: 5, method: "ping", params: { pad: "x".repeat(70_000) } });
    assert.equal(res.status, 413);
  });
});

describe("MCP tools answer what the HTTP API answers", () => {
  test("emoji_search = GET /api/emoji-search (words and a pack; a facet filter)", async () => {
    for (const [query, packName] of [["check", "checkified"], ["checkmark", undefined], [`style:outline`, checkified.name]] as const) {
      const qs = `q=${encodeURIComponent(query)}${packName ? `&pack=${packName}` : ""}`;
      const http = await httpJson(search.GET(request(`/api/emoji-search?${qs}`)));
      assert.deepEqual(await tool("emoji_search", { query, ...(packName && { pack: packName }) }), http, query);
    }
  });
  test("emoji_pack = GET /api/emoji-pack/{name}, also for a pack outside the catalog", async () => {
    for (const name of ["checkified", FAILING.outside]) {
      const http = await httpJson(pack.GET(request(`/api/emoji-pack/${name}`), params({ name })));
      assert.deepEqual(await tool("emoji_pack", { name }), http, name);
    }
  });
  test("emoji_facets = GET /api/emoji-facets with packs limited to the names asked", async () => {
    const http = await httpJson(facets.GET(request("/api/emoji-facets")));
    const names = ["checkified", other.name.toUpperCase()];
    const wanted = { ...http, packs: (http.packs as Obj[]).filter((p) => ["checkified", other.name].includes(p.name as string)) };
    assert.deepEqual(await tool("emoji_facets", { packs: names }), wanted);
    assert.deepEqual(await tool("emoji_facets", {}), { ...http, packs: [] });
  });
  test("emoji_by_id = GET /api/emoji-pack/by-id", async () => {
    const list = [checkified.emoji[0].id, other.emoji[0].id, "1"];
    const http = await httpJson(byId.GET(request(`/api/emoji-pack/by-id?ids=${list.join(",")}`)));
    assert.deepEqual(await tool("emoji_by_id", { ids: list }), http);
  });
  test("errors carry the HTTP error body: emoji_pack of a missing pack and of a sticker set", async () => {
    for (const [name, code] of [[FAILING.missing, "PACK_NOT_FOUND"], [FAILING.regular, "NOT_EMOJI_PACK"], [FAILING.broken, "TELEGRAM_ERROR"]]) {
      const http = await httpJson(pack.GET(request(`/api/emoji-pack/${name}`), params({ name })));
      const { json } = await toolError("emoji_pack", { name });
      assert.equal(json!.error!.code, code);
      assert.deepEqual(json, http);
    }
  });
  test("over 100 KB: the largest list is cut, with a note, and the rest is the HTTP answer", async () => {
    const http = await httpJson(search.GET(request("/api/emoji-search?q=heart")));
    assert.ok(JSON.stringify(http).length > MCP_RESPONSE_MAX, "pick a query whose answer is over the limit");
    const answer = await tool("emoji_search", { query: "heart" });
    const cut = answer.truncated as { note: string; fields: { field: string; kept: number; total: number }[] };
    assert.match(cut.note, /100 KB/);
    const emoji = cut.fields.find((f) => f.field === "emoji")!;
    assert.equal(emoji.total, (http.emoji as unknown[]).length);
    assert.ok(emoji.kept > 0 && emoji.kept < emoji.total);
    const rest = { ...answer };
    delete rest.truncated;
    const expected: Obj = { ...http };
    for (const f of cut.fields) expected[f.field] = (http[f.field] as unknown[]).slice(0, f.kept);
    assert.deepEqual(rest, expected);
  });
});

describe("MCP tools for choosing packs", () => {
  test("emoji_rank_packs: the library ranking, best first, with the catalog version", async () => {
    const args = { style: ["outline"], use: ["support"], theme: "both" as const, top: 5 };
    const answer = await tool("emoji_rank_packs", args);
    assert.deepEqual(answer, rankPacks({ brief: { style: ["outline"], use: ["support"] }, theme: "both", top: 5 }));
    const rows = answer.packs as { score: number; matched: unknown[] }[];
    assert.equal(rows.length, 5);
    assert.ok(rows.every((r, i) => i === 0 || rows[i - 1].score >= r.score), "not sorted");
    assert.equal(answer.taxonomy, catalogVersion.taxonomy);
  });
  test("emoji_rank_packs: labels are read, unknown values are reported, require filters hard", async () => {
    const answer = await tool("emoji_rank_packs", { style: ["контурный", "nosuch"], require: ["motion:static"] });
    assert.deepEqual(answer.brief, { style: ["outline"] });
    assert.ok((answer.problems as string[]).some((p) => p.includes("style:nosuch")));
    const nothing = await tool("emoji_rank_packs", { require: ["style:nosuch"] });
    assert.equal(nothing.total, 0);
  });
  test("emoji_rank_packs without a brief: BAD_REQUEST as an isError result", async () => {
    const { json } = await toolError("emoji_rank_packs", {});
    assert.equal(json!.error!.code, "BAD_REQUEST");
  });
  test("emoji_pick_family: one pack, an icon map of that pack's real ids", async () => {
    const slots = ["home", "done", "favorite", "cart", "settings"];
    const answer = await tool("emoji_pick_family", { slots, style: ["outline"] });
    const map = answer.map as { family: string; icons: Record<string, { id: string; set: string }>; missing: string[] };
    assert.ok(map, "no family picked");
    const family = catalogPacks().find((p) => p.name === map.family)!;
    const own = new Set(family.emoji.map((e) => e.id));
    for (const [slot, icon] of Object.entries(map.icons)) {
      assert.equal(icon.set, map.family, slot);
      assert.ok(own.has(icon.id), `${slot}: ${icon.id} is not in ${map.family}`);
    }
    assert.deepEqual([...Object.keys(map.icons), ...map.missing].sort(), [...slots].sort());
    assert.deepEqual(answer.brief, { style: ["outline"], fit: ["both"] });
    const ranking = answer.ranking as { name: string; score: number }[];
    assert.equal(ranking[0].name, map.family);
    assert.ok(ranking.length <= 6);
  });
  test("emoji_pick_family: a slot outside the list or an extra argument is refused", async () => {
    assert.match((await toolError("emoji_pick_family", { slots: ["teleport"] })).text, /slots/);
    assert.match((await toolError("emoji_pick_family", { slots: ["home"], colour: ["blue"] })).text, /colour|unrecognized/i);
    assert.match((await toolError("emoji_search", { query: 5 })).text, /query/);
  });
  test("an unknown tool: isError", async () => {
    assert.match((await toolError("emoji_nosuch", {})).text, /emoji_nosuch/);
  });
});

describe("MCP limits", () => {
  test("a tool call counts against its endpoint's limit, shared with the HTTP route", async () => {
    const ip = client();
    for (let i = 0; i < RATE_LIMITS.pack; i++) await pack.GET(request("/api/emoji-pack/checkified", ip), params({ name: "checkified" }));
    const { json } = await toolError("emoji_pack", { name: "checkified" }, ip);
    assert.equal(json!.error!.code, "RATE_LIMITED");
    assert.equal(json!.retryAfter, 60);
  });
  test(`every request counts against the MCP limit: ${RATE_LIMITS.mcp} a minute, then 429 RATE_LIMITED as documented`, async () => {
    const ip = client();
    for (let i = 0; i < RATE_LIMITS.mcp; i++) assert.equal((await post({ jsonrpc: "2.0", id: i, method: "ping" }, { ip })).status, 200);
    const res = await post({ jsonrpc: "2.0", id: 0, method: "ping" }, { ip });
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("retry-after"), "60");
    const doc = openApiDocument("http://localhost:3000") as unknown as { paths: Record<string, { post: { responses: Record<string, { content: Record<string, { schema: Obj }> }> } }> };
    const spec = doc.paths["/api/mcp"].post.responses["429"].content["application/json"].schema;
    assert.deepEqual(validate(res.body, spec, doc), []);
  });
});
