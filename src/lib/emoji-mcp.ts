// The emoji library as a remote MCP server (POST /api/mcp): read-only tools that wrap the same code
// as the HTTP API (lib/emoji-answers.ts) and the pack pickers (lib/emoji-pick.ts). Stateless: the
// route builds one server per request for one client, so every tool call counts against that
// client's limit for its endpoint, the same counter the HTTP route uses.
import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MCP_RESPONSE_MAX, RATE_LIMITS, RATE_WINDOW_SECONDS } from "./emoji-api-contract";
import { byIdAnswer, facetsAnswer, packAnswer, searchAnswer } from "./emoji-answers";
import { getLibrary } from "./emoji-library";
import { EMOJI_EXPORT_PATH } from "./emoji-links";
import { allow, errorResponse, IDS_MAX, ResolverError } from "./emoji-pack";
import { PACK_NAME } from "./emoji-pack-list";
import { pickFamily, rankPacks, type Brief } from "./emoji-pick";
import { SLOT_NAMES } from "./emoji-slots";

const ENVELOPE = 512; // the JSON-RPC envelope around a tool result's text
const FACETS_PACKS_MAX = 40;

const CATALOG: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const TELEGRAM: ToolAnnotations = { ...CATALOG, openWorldHint: true };

const INSTRUCTIONS = "Telegram premium (custom) emoji library: search emoji and packs, read a pack, rank packs by tags and " +
  "pick one pack family for a bot's icon slots. Read-only. Keep emoji ids as strings. Use a custom emoji in a message as " +
  '<tg-emoji emoji-id="ID">FALLBACK</tg-emoji> (parse_mode HTML) and on a button as icon_custom_emoji_id. Errors come back as ' +
  "{ok:false, error:{code, message}}; on RATE_LIMITED wait retryAfter seconds.";

// ------------------------------------------------------------------ input schemas

const packName = z.string().regex(PACK_NAME, "1-64 ASCII letters, digits or underscores");
const values = (what: string) => z.array(z.string().min(1).max(40)).max(12).optional()
  .describe(`${what}: taxonomy value ids or their English/Russian labels (emoji_facets lists them).`);
const briefShape = {
  style: values("Drawing style, e.g. outline, glyph, flat, 3d"),
  color: values("Main colours, e.g. blue, gold"),
  palette: values("Palette, e.g. monochrome, vivid"),
  topic: values("What the emoji show, e.g. interface, finance"),
  mood: values("Mood, e.g. calm, playful"),
  role: values("Role in an interface, e.g. navigation, status"),
  use: values("Bot category, e.g. shop, support"),
  require: z.array(z.string().regex(/^[a-z]+:\S{1,40}$/, "facet:value")).max(12).optional()
    .describe("Hard filters as facet:value, e.g. motion:static or fit:adaptive: a pack without the tag is left out."),
  theme: z.enum(["both", "light", "dark"]).optional().describe("Chat theme the icons must suit; both prefers packs that repaint (fit:adaptive)."),
};
const BRIEF_KEYS = ["style", "color", "palette", "topic", "mood", "role", "use"] as const;
const briefOf = (args: Partial<Record<(typeof BRIEF_KEYS)[number], string[]>>): Brief =>
  Object.fromEntries(BRIEF_KEYS.filter((k) => args[k]?.length).map((k) => [k, args[k]]));

// ------------------------------------------------------------------ results

const jsonBytes = (text: string) => Buffer.byteLength(JSON.stringify(text));

/** The answer as JSON text that fits MCP_RESPONSE_MAX. When it is larger, every top-level list keeps the
 *  same share of its items (the first ones: lists are best first), and `truncated` says how many stayed
 *  and how to get the rest. */
export function fitAnswer(answer: Record<string, unknown>, max = MCP_RESPONSE_MAX - ENVELOPE): string {
  const whole = JSON.stringify(answer);
  if (jsonBytes(whole) <= max) return whole;
  const lists = Object.keys(answer).filter((k) => Array.isArray(answer[k]) && (answer[k] as unknown[]).length);
  const render = (permille: number) => {
    const cut: Record<string, unknown> = { ...answer };
    const fields = lists.map((field) => {
      const all = answer[field] as unknown[];
      const kept = Math.floor(all.length * permille / 1000);
      cut[field] = all.slice(0, kept);
      return { field, kept, total: all.length };
    }).filter((f) => f.kept < f.total);
    return JSON.stringify({
      ...cut,
      truncated: {
        note: `Cut to fit the ${MCP_RESPONSE_MAX / 1024} KB answer limit: ${fields.map((f) => `${f.field} keeps ${f.kept} of ${f.total}`).join(", ")}. ` +
          `Narrow the request (one pack, facet:value filters, fewer names), or read everything from the catalog export ${EMOJI_EXPORT_PATH}.`,
        fields,
      },
    });
  };
  let lo = 0, hi = 999;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (jsonBytes(render(mid)) <= max) lo = mid; else hi = mid - 1;
  }
  return render(lo);
}

/** One tool call: the client's limit for `bucket` first, then the work. Every failure, ours or
 *  Telegram's, is an isError result with the HTTP API's error body; never a protocol error. */
async function runTool(client: string, bucket: keyof typeof RATE_LIMITS, work: () => unknown, max?: number): Promise<CallToolResult> {
  try {
    if (!allow(`${bucket}:${client}`, RATE_LIMITS[bucket], RATE_WINDOW_SECONDS * 1000)) {
      throw new ResolverError("RATE_LIMITED", 429, "too many requests; retry in a minute", RATE_WINDOW_SECONDS);
    }
    return { content: [{ type: "text", text: fitAnswer(await work() as Record<string, unknown>, max) }] };
  } catch (err) {
    const res = errorResponse(err);
    const body = await res.json() as { ok: false; error: { code: string; message: string } };
    const retryAfter = Number(res.headers.get("retry-after")) || undefined;
    return { isError: true, content: [{ type: "text", text: JSON.stringify({ ...body, ...(retryAfter ? { retryAfter } : {}) }) }] };
  }
}

// ------------------------------------------------------------------ server

/** A fresh server for one request of one client (`client` keys its rate limits). `messages`: how many
 *  requests the POST carries; their answers share MCP_RESPONSE_MAX less `reserve` (the bytes of their ids). */
export function emojiMcpServer(client: string, { messages = 1, reserve = 0 } = {}): McpServer {
  const max = Math.floor((MCP_RESPONSE_MAX - reserve) / Math.max(1, messages)) - ENVELOPE;
  const run = (c: string, bucket: keyof typeof RATE_LIMITS, work: () => unknown) => runTool(c, bucket, work, max);
  const server = new McpServer({ name: "telegram-emoji-library", title: "Telegram Emoji Library", version: "1.0.0" }, { instructions: INSTRUCTIONS });

  server.registerTool("emoji_search", {
    title: "Search emoji",
    description: "Emoji and packs of the library ranked for words or an emoji, plus facet:value filters in the query " +
      "(style:outline fit:adaptive motion:static color:blue use:shop). Same answer as GET /api/emoji-search. " +
      "Up to 60 emoji, or 200 within one pack; each with id, fallback, format, adaptive, facets and pageUrl.",
    inputSchema: z.object({
      query: z.string().min(1).max(160).describe("Words, an emoji and/or facet:value filters; up to six words."),
      pack: packName.optional().describe("Only emoji of this catalog pack."),
    }).strict(),
    annotations: CATALOG,
  }, ({ query, pack }) => run(client, "search", () => searchAnswer(query, pack)));

  server.registerTool("emoji_pack", {
    title: "Read a pack",
    description: "One Telegram emoji pack: title, up to 200 emoji (id, fallback, format, adaptive, picture paths, facets), " +
      "the pack's tags, description, look and compatible packs. Same answer as GET /api/emoji-pack/{name}; packs outside the catalog " +
      "come without tags. Reads Telegram.",
    inputSchema: z.object({ name: packName.describe("Short name, as in t.me/addemoji/<name>.") }).strict(),
    annotations: TELEGRAM,
  }, ({ name }) => run(client, "pack", () => packAnswer(name)));

  server.registerTool("emoji_facets", {
    title: "Tag taxonomy",
    description: "The tag taxonomy (facets: style, color, palette, fit, motion, topic, mood, role, use; their values with English and " +
      "Russian labels), the confidence thresholds, and the tags of the packs you name. The same fields as GET /api/emoji-facets, " +
      `with packs limited to the names given (every pack at once is ~750 KB: rank them with emoji_rank_packs instead).`,
    inputSchema: z.object({
      packs: z.array(packName).max(FACETS_PACKS_MAX).optional().describe(`Up to ${FACETS_PACKS_MAX} catalog pack names whose tags to include.`),
    }).strict(),
    annotations: CATALOG,
  }, ({ packs = [] }) => run(client, "facets", () => {
    const wanted = new Set(packs.map((p) => p.toLowerCase()));
    const answer = facetsAnswer();
    return { ...answer, packs: answer.packs.filter((p) => wanted.has(p.name.toLowerCase())) };
  }));

  server.registerTool("emoji_rank_packs", {
    title: "Rank packs by tags",
    description: "Catalog packs ordered by how well their tags fit a brief (style, color, palette, topic, mood, role, use), with hard " +
      "require filters, a motion preference and the chat theme. Each row: score, the tags that matched, and up to four compatible packs.",
    inputSchema: z.object({
      ...briefShape,
      motion: z.enum(["static", "any"]).optional().describe("static ranks moving packs lower (use require motion:static to exclude them)."),
      top: z.number().int().min(1).max(50).optional().describe("How many packs to return (default 8)."),
    }).strict(),
    annotations: CATALOG,
  }, (args) => run(client, "facets", () => {
    const brief = briefOf(args);
    if (!Object.keys(brief).length && !args.require?.length) {
      throw new ResolverError("BAD_REQUEST", 400, "give at least one of style, color, palette, topic, mood, role, use or require");
    }
    return rankPacks({ brief, require: args.require, motion: args.motion, theme: args.theme ?? "both", top: args.top ?? 8 });
  }));

  server.registerTool("emoji_pick_family", {
    title: "Pick one pack for a bot",
    description: "ONE pack that covers the bot's icon slots (coverage first, then the brief's tags, theme safety, static icons, one format) " +
      `and its icon map: slot -> {id, set, fallback, animated, adaptive}. Slots: ${SLOT_NAMES.join(", ")}.`,
    inputSchema: z.object({
      slots: z.array(z.enum(SLOT_NAMES as [string, ...string[]])).min(1).max(SLOT_NAMES.length).describe("The meanings the bot needs an icon for."),
      ...briefShape,
      motion: z.enum(["static", "any"]).optional().describe("static (default) prefers static icons for buttons."),
      top: z.number().int().min(1).max(20).optional().describe("How many ranked packs to list (default 6)."),
    }).strict(),
    annotations: CATALOG,
  }, (args) => run(client, "facets", async () => {
    const { source } = await getLibrary();
    return pickFamily(source, {
      slots: [...new Set(args.slots)], brief: briefOf(args), require: args.require, motion: args.motion ?? "static",
      theme: args.theme ?? "both", top: args.top ?? 6,
    });
  }));

  server.registerTool("emoji_by_id", {
    title: "Pack of emoji ids",
    description: "The pack (set) of each custom_emoji_id; ids Telegram does not know are left out. Same answer as " +
      "GET /api/emoji-pack/by-id. Reads Telegram.",
    inputSchema: z.object({
      ids: z.array(z.string().regex(/^\d{1,20}$/, "digits")).min(1).max(IDS_MAX).describe(`1 to ${IDS_MAX} custom emoji ids, as strings.`),
    }).strict(),
    annotations: TELEGRAM,
  }, ({ ids }) => run(client, "ids", () => byIdAnswer(ids.join(","))));

  // The tool list is fixed, and a stateless server has no stream to announce changes on.
  server.server.registerCapabilities({ tools: { listChanged: false } });
  return server;
}
