// The emoji library API as an OpenAPI 3.1 document, served at /api/emoji-openapi.json. Limits and
// error codes come from lib/emoji-api-contract.ts (the routes read the same table); examples,
// facet names and the catalog version come from the committed catalog, so the document describes
// the data this build serves. tests/contract checks every route handler against it.
import "server-only";
import { CHECKMARK } from "@/content/emoji-example";
import { ERRORS, RATE_LIMITS, RATE_WINDOW_SECONDS, type ErrorCode } from "./emoji-api-contract";
import { catalogExport } from "./emoji-export";
import { catalogPacks, catalogVersion, emojiFacets, facetCodes, facetsMeta, packFacets, taxonomy, type Look } from "./emoji-facets";
import { EMOJI_EXPORT_PATH, EMOJI_MCP_PATH, EMOJI_OPENAPI_PATH, emojiPackPath } from "./emoji-links";

type Schema = Record<string, unknown>;
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const str = (description: string, extra: Schema = {}): Schema => ({ type: "string", description, ...extra });
const nullable = (description: string): Schema => ({ type: ["string", "null"], description });
const object = (properties: Record<string, Schema>, optional: string[] = [], description?: string): Schema => ({
  type: "object", ...(description && { description }), properties, required: Object.keys(properties).filter((k) => !optional.includes(k)),
});
const list = (items: Schema, description?: string): Schema => ({ type: "array", ...(description && { description }), items });
const pair = (first: Schema, second: Schema, description: string): Schema => ({
  type: "array", description, prefixItems: [first, second], minItems: 2, items: false,
});

/** The catalog version every JSON answer carries. */
const VERSION_FIELDS = { taxonomy: ref("TaxonomyVersion"), generated: ref("Generated") };

/** Distinct look values in this catalog, so the document lists what agents can filter on. */
function lookValues(field: keyof Look): string {
  const seen = new Set(catalogPacks().map((p) => p.look?.[field]).filter(Boolean));
  return [...seen].sort().join(", ");
}

function schemas(): Record<string, Schema> {
  const facetNames = Object.keys(taxonomy.facets);
  const legend = Object.entries(facetCodes).map(([code, facet]) => `${code}=${facet}`).join(", ");
  return {
    TaxonomyVersion: { type: "integer", minimum: 1, description: "Version of the tag taxonomy (facets and their values). A new version can rename or drop values." },
    Generated: str("Day the catalog's tags were built (YYYY-MM-DD).", { format: "date" }),
    PackName: str("Short name of a Telegram emoji pack, as in t.me/addemoji/<name>.", { pattern: "^[A-Za-z0-9_]{1,64}$" }),
    EmojiId: str("Telegram custom_emoji_id. Keep it a string: it does not fit a double.", { pattern: "^\\d{1,20}$" }),
    Format: { type: "string", enum: ["static", "animated", "video"], description: "static: WEBP; animated: TGS (gzip Lottie); video: WEBM." },
    FacetName: { type: "string", enum: facetNames, description: "A facet of the taxonomy (GET /api/emoji-facets lists its values)." },
    Confidence: { type: "number", minimum: 0, maximum: 1, description: "How sure the tag is, 0 to 1." },
    Tag: pair(str("Value id of the facet."), ref("Confidence"), "[value, confidence]"),
    FacetMap: {
      type: "object", description: "Tags by facet, most confident first.",
      propertyNames: ref("FacetName"), additionalProperties: list(ref("Tag")),
    },
    Compatible: list(pair(ref("PackName"), ref("Confidence"), "[pack name, similarity]"),
      "Packs drawn alike (style, palette, colours, motion, theme fit), most similar first; similarity 0.75 and up."),
    Look: object({
      line_weight: str(`Stroke weight: ${lookValues("line_weight")}.`),
      fill: str(`Fill: ${lookValues("fill")}.`),
      perspective: str(`Perspective: ${lookValues("perspective")}.`),
      shadows: str(`Shadows: ${lookValues("shadows")}.`),
      characters: str(`Share of emoji with characters (faces, figures): ${lookValues("characters")}.`),
      drawn: str("One line on how the pack is drawn."),
    }, [], "How the pack is drawn, from a vision pass over its contact sheet."),
    DescriptionText: object({
      what: str("What the pack shows."), for: str("What a bot uses it for."), not_for: str("What it does not suit."),
    }),
    Description: object({ en: ref("DescriptionText"), ru: ref("DescriptionText"), uk: ref("DescriptionText") }, ["en", "ru", "uk"],
      "What the pack is and is for, per language. Optional: present only when the catalog has it."),
    ErrorCode: { type: "string", enum: Object.keys(ERRORS), description: Object.entries(ERRORS).map(([c, e]) => `${c} (${e.status}): ${e.meaning}`).join(" ") },
    PackEmoji: object({
      id: ref("EmojiId"),
      fallback: str("The ordinary emoji Telegram shows where custom emoji cannot be drawn; may be empty."),
      format: ref("Format"),
      adaptive: { type: "boolean", description: "needs_repainting: Telegram draws it in the text colour, so it fits light and dark themes." },
      preview: nullable("Path of the picture (WEBP, the WEBM of a video emoji, the thumbnail of a TGS), relative to the site."),
      animation: nullable("Path of the TGS file of an animated emoji, relative to the site."),
      still: nullable("Path of a video emoji's still thumbnail, relative to the site."),
      facets: ref("FacetMap"),
    }, ["facets"]),
    EmojiHit: object({
      pack: ref("PackName"), id: ref("EmojiId"), fallback: str("Ordinary emoji it stands for; may be empty."), format: ref("Format"),
      adaptive: { type: "boolean" }, preview: nullable("Picture path, relative to the site."), animation: nullable("TGS path, relative to the site."),
      still: nullable("Still thumbnail path, relative to the site."), score: { type: "number", description: "Relevance; higher is better." },
      facets: ref("FacetMap"), pageUrl: str("Library page of the emoji, relative to the site."),
    }),
    SearchResponse: object({
      ok: { const: true }, ...VERSION_FIELDS,
      query: str("The words searched, after facet filters were taken out."),
      filters: list(str("facet:value"), "Facet filters applied, as facet:value-id."),
      unknownFilters: list(str("facet:value"), "facet:value tokens with a known facet but an unknown value; ignored."),
      emoji: list(ref("EmojiHit"), "Best matches first: up to 60, or 200 with a pack filter."),
      packs: list(object({
        name: ref("PackName"), score: { type: "number" }, hits: { type: "integer", minimum: 1, description: "Matching emoji in the pack." },
        facets: ref("FacetMap"), pageUrl: str("Library page of the pack, relative to the site."),
      }), "Packs with matches, best first."),
      suggest: object({
        complete: list(str("A completed query.")), related: list(str("A tag that comes up often in the results.")),
        categories: list(str("A matching library category.")), didYouMean: nullable("A corrected query when nothing matched."),
      }),
      total: { type: "integer", minimum: 0, description: "Emoji matches before truncation." },
    }),
    PackResponse: object({
      ok: { const: true }, ...VERSION_FIELDS,
      name: ref("PackName"), title: str("Pack title in Telegram."),
      emoji: list(ref("PackEmoji"), "Up to 200 emoji, in pack order. facets on each only for a catalog pack."),
      facets: { oneOf: [ref("FacetMap"), { type: "null" }], description: "Pack tags; null for a pack outside the catalog." },
      compatible: ref("Compatible"), look: ref("Look"), description: ref("Description"),
      pageUrl: nullable("Library page, relative to the site; null for a pack outside the catalog."),
      telegramUrl: str("The pack's t.me/addemoji link.", { format: "uri" }),
    }, ["look", "description"]),
    ByIdResponse: object({
      ok: { const: true }, ...VERSION_FIELDS,
      emoji: list(object({
        id: ref("EmojiId"), set: ref("PackName"),
        pageUrl: nullable("Library page of the emoji, relative to the site; null when its pack is not in the catalog."),
        telegramUrl: str("The pack's t.me/addemoji link.", { format: "uri" }),
      }), "One entry per id Telegram knows; unknown ids are left out."),
    }),
    FacetsResponse: object({
      ok: { const: true },
      generated: ref("Generated"),
      taxonomy: object({
        version: ref("TaxonomyVersion"),
        facets: {
          type: "object", propertyNames: ref("FacetName"),
          additionalProperties: object({
            label: ref("Label"),
            measured: { type: "boolean", description: "Measured from Telegram data or pixels rather than read from words." },
            scope: list({ type: "string", enum: ["pack", "emoji"] }, "Whether packs, emoji or both carry this facet."),
            values: { type: "object", description: "Values by id.", additionalProperties: ref("Label") },
          }),
        },
      }, [], "The taxonomy. Its version is the `taxonomy` number of the other answers."),
      thresholds: object({
        emoji: ref("Confidence"), pack: ref("Confidence"), show: ref("Confidence"),
      }, [], "Confidence from which a tag counts for an emoji filter, a pack filter, and display."),
      packs: list(object({
        name: ref("PackName"), category: str("Library category."), count: { type: "integer", minimum: 0, description: "Emoji in the pack." },
        meanings: { type: "integer", minimum: 0, description: "Distinct ordinary emoji the pack stands for." },
        facets: ref("FacetMap"), compatible: ref("Compatible"), look: ref("Look"), description: ref("Description"),
      }, ["look", "description"]), "Every catalog pack."),
    }),
    Label: object({ en: str("English label."), ru: str("Russian label.") }),
    CatalogLine: {
      ...object({
        name: ref("PackName"),
        title: nullable("Pack title, when the catalog data carries it; GET /api/emoji-pack/{name} always returns Telegram's title."),
        category: str("Library category."), count: { type: "integer", minimum: 0 }, meanings: { type: "integer", minimum: 0 },
        facets: ref("FacetMap"), look: ref("Look"), description: ref("Description"), compatible: ref("Compatible"),
        emoji: list(object({
          id: ref("EmojiId"),
          codes: str(`The emoji's own tags: facet code, value and confidence x10, e.g. "c:blue@9,white@6;s:outline@6". Codes: ${legend}. ` +
            "An emoji without its own style or topic takes its pack's; motion and adaptivity come from Telegram (GET /api/emoji-pack/{name}).",
          { pattern: "^(?:[a-z]:[^;@,]+@\\d+(?:,[^;@,]+@\\d+)*(?:;[a-z]:[^;@,]+@\\d+(?:,[^;@,]+@\\d+)*)*)?$" }),
        }), "Every emoji of the pack."),
        ...VERSION_FIELDS,
      }, ["look", "description"], `One line of ${EMOJI_EXPORT_PATH}: one pack.`),
      examples: [exampleLine()],
    },
  };
}

function exampleLine() {
  const line = catalogPacks().find((p) => p.name === CHECKMARK.name) ?? catalogPacks()[0];
  return { ...line, emoji: line.emoji.slice(0, 2), ...catalogVersion };
}

// ------------------------------------------------------------------ examples (one per endpoint)

const sample = {
  id: CHECKMARK.id, fallback: CHECKMARK.fallback, format: CHECKMARK.format, adaptive: CHECKMARK.adaptive,
  preview: CHECKMARK.preview, animation: CHECKMARK.animation, still: null,
};

function examples() {
  const pf = packFacets(CHECKMARK.name);
  const facets = emojiFacets(CHECKMARK.name, CHECKMARK.id);
  return {
    search: {
      ok: true, ...catalogVersion, query: "checkmark", filters: [], unknownFilters: [],
      emoji: [{ pack: CHECKMARK.name, ...sample, score: 5, facets, pageUrl: CHECKMARK.path }],
      packs: [{ name: CHECKMARK.name, score: 2.7, hits: 1, facets: pf?.facets ?? {}, pageUrl: emojiPackPath(CHECKMARK.name) }],
      suggest: { complete: [], related: [], categories: [], didYouMean: null }, total: 1,
    },
    pack: {
      ok: true, ...catalogVersion, name: CHECKMARK.name, title: CHECKMARK.title, emoji: [{ ...sample, facets }],
      facets: pf?.facets ?? null, compatible: pf?.compatible ?? [], ...(pf?.look && { look: pf.look }),
      ...(pf?.description && { description: pf.description }),
      pageUrl: emojiPackPath(CHECKMARK.name), telegramUrl: CHECKMARK.telegramUrl,
    },
    byId: { ok: true, ...catalogVersion, emoji: [{ id: CHECKMARK.id, set: CHECKMARK.name, pageUrl: CHECKMARK.path, telegramUrl: CHECKMARK.telegramUrl }] },
    facets: {
      ok: true, generated: facetsMeta.generated,
      taxonomy: { version: taxonomy.version, facets: { fit: {
        label: { en: taxonomy.facets.fit.label.en, ru: taxonomy.facets.fit.label.ru }, measured: !!taxonomy.facets.fit.measured, scope: taxonomy.facets.fit.scope,
        values: Object.fromEntries(Object.entries(taxonomy.facets.fit.values).map(([v, d]) => [v, { en: d.en, ru: d.ru }])),
      } } },
      thresholds: facetsMeta.thresholds,
      packs: catalogPacks().filter((p) => p.name === CHECKMARK.name).map(({ name, category, count, meanings, facets: f, compatible, look, description }) => ({
        name, category, count, meanings, facets: f, compatible, ...(look && { look }), ...(description && { description }),
      })),
    },
  };
}

// ------------------------------------------------------------------ operations

const RETRY_AFTER = { description: "Seconds to wait before retrying.", schema: { type: "integer", minimum: 1 } };

/** One response per status; a status shared by several codes lists them all. */
function errorResponses(codes: ErrorCode[]): Record<string, unknown> {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const c of codes) byStatus.set(ERRORS[c].status, [...(byStatus.get(ERRORS[c].status) ?? []), c]);
  return Object.fromEntries([...byStatus.entries()].sort((a, b) => a[0] - b[0]).map(([status, list]) => [String(status), {
    description: list.map((c) => `${c}: ${ERRORS[c].meaning}`).join(" "),
    ...(status === 429 || status === 503 ? { headers: { "Retry-After": RETRY_AFTER } } : {}),
    content: { "application/json": { schema: object({
      ok: { const: false },
      error: object({ code: { type: "string", enum: list }, message: str("Human-readable detail; do not parse it.") }),
    }) } },
  }]));
}

function rateLimit(limit: number) {
  return {
    "x-rate-limit": { requests: limit, windowSeconds: RATE_WINDOW_SECONDS, scope: "client IP, endpoint and server instance" },
    description: `Limit: ${limit} requests a minute per client. CDN-cached answers do not count.`,
  };
}

const json = (schema: string, example: unknown) => ({ "application/json": { schema: ref(schema), example } });
const pathParam = (name: string, schema: string, description: string) => ({ name, in: "path", required: true, description, schema: ref(schema) });
const RESOLVER_ERRORS: ErrorCode[] = ["TOO_LARGE", "RATE_LIMITED", "INTERNAL", "TELEGRAM_ERROR", "TELEGRAM_UNREACHABLE", "BUSY", "RESOLVER_OFF"];
const MEDIA_ERRORS: ErrorCode[] = ["BAD_REQUEST", "PACK_NOT_FOUND", ...RESOLVER_ERRORS];

function media(summary: string, operationId: string, kind: string, limit: number, types: string[], errors: ErrorCode[]) {
  const { description, ...limits } = rateLimit(limit);
  return {
    get: {
      tags: ["media"], operationId, summary,
      description: `${kind} Proxied from Telegram, whose file URL carries the bot token. The URL takes no query string (400 BAD_REQUEST), ` +
        `so every file has one cacheable address. ${description}`,
      ...limits,
      parameters: [pathParam("name", "PackName", "Pack short name."), pathParam("id", "EmojiId", "custom_emoji_id of an emoji in that pack.")],
      responses: {
        200: { description: "The file.", content: Object.fromEntries(types.map((t) => [t, {}])) },
        ...errorResponses(errors),
      },
    },
  };
}

const MCP_TOOLS = "emoji_search, emoji_pack, emoji_facets, emoji_rank_packs, emoji_pick_family, emoji_by_id";

/** POST /api/mcp: JSON-RPC 2.0 over MCP Streamable HTTP, described here so the endpoint has a contract too. */
function mcpOperation(origin: string) {
  const { description: limit, ...limits } = rateLimit(RATE_LIMITS.mcp);
  return {
    post: {
      tags: ["mcp"], operationId: "mcp", summary: "Remote MCP server (Streamable HTTP)",
      description: `Model Context Protocol 2025-11-25 (older revisions are negotiated), stateless and read-only, no key. Tools: ${MCP_TOOLS}; ` +
        "each answers what its HTTP endpoint answers, cut to 100 KB with a `truncated` note when larger. Send Accept: application/json, " +
        "text/event-stream. Answers are one JSON body; GET and DELETE answer 405. Tool failures are isError results carrying the " +
        `error body of this API; protocol errors are JSON-RPC errors. Connect: claude mcp add --transport http telegram-emoji ${origin}${EMOJI_MCP_PATH}. ` +
        `${limit} Each tool call also counts against its endpoint's limit (search, pack, by-id, facets).`,
      ...limits,
      requestBody: {
        required: true,
        content: { "application/json": { schema: object({
          jsonrpc: { const: "2.0" }, id: { type: ["string", "integer"] }, method: str("initialize, tools/list, tools/call, ping, or a notification."),
          params: { type: "object" },
        }, ["id", "params"], "A JSON-RPC 2.0 request or notification (no id).") } },
      },
      responses: {
        200: { description: "The JSON-RPC response: a result, or a JSON-RPC error.", content: { "application/json": { schema: object({
          jsonrpc: { const: "2.0" }, id: { type: ["string", "integer", "null"] }, result: { type: "object" },
          error: object({ code: { type: "integer" }, message: str("What went wrong.") }, [], "A JSON-RPC error."),
        }, ["result", "error"]) } } },
        202: { description: "A notification was accepted; no body." },
        403: { description: "A browser page of another site (its Origin header) is refused; clients that send no Origin are served.",
          content: { "application/json": { schema: object({
            jsonrpc: { const: "2.0" }, id: { type: "null" },
            error: object({ code: { const: -32000 }, message: str("What went wrong.") }, [], "A JSON-RPC error."),
          }, [], "A JSON-RPC error, not this API's error body.") } } },
        ...errorResponses(["RATE_LIMITED"]),
      },
    },
  };
}

export function openApiDocument(origin: string) {
  const ex = examples();
  const file = catalogExport();
  const exportUrl = `${origin}${EMOJI_EXPORT_PATH}`;
  return {
    openapi: "3.1.0",
    info: {
      title: "Telegram Emoji Library API",
      version: "1.0.0",
      summary: "Search Telegram premium emoji packs, read their emoji and tags, and download the whole catalog.",
      description: "Read-only JSON over GET; no key. Keep emoji ids as strings. Resolve relative paths (pageUrl, preview, animation, still) " +
        "against the server URL. Every JSON success answer carries the catalog version: `taxonomy` (tag taxonomy version) and `generated` " +
        `(day the tags were built); /api/emoji-facets puts the taxonomy version at taxonomy.version. Errors are {ok:false, error:{code, message}}; ` +
        `branch on code, never on message. Limits are per client IP, per endpoint and per server instance, over ${RATE_WINDOW_SECONDS} s. ` +
        `This build: taxonomy ${catalogVersion.taxonomy}, generated ${catalogVersion.generated}.`,
      "x-catalog-version": catalogVersion,
    },
    servers: [{ url: origin }],
    tags: [
      { name: "search", description: "Find emoji and packs by words, emoji and facet:value filters." },
      { name: "packs", description: "One pack's emoji, the pack of an emoji id, and every pack's tags." },
      { name: "media", description: "Pictures and animations of single emoji." },
      { name: "catalog", description: "This document and the offline export." },
      { name: "mcp", description: "The same library as a remote MCP server for agents." },
    ],
    paths: {
      "/api/emoji-search": {
        get: {
          tags: ["search"], operationId: "searchEmoji", summary: "Search emoji and packs",
          ...rateLimit(RATE_LIMITS.search),
          parameters: [
            { name: "q", in: "query", required: false, schema: { type: "string" },
              description: "Words or an emoji, plus facet:value filters (style:outline fit:adaptive motion:static color:blue use:shop; " +
                "a value by id or by its English or Russian label). Clipped to 160 characters, up to six words. Blank: empty result." },
            { name: "pack", in: "query", required: false, schema: { type: "string" },
              description: "Only emoji of this catalog pack (case-insensitive). An unknown name gives an empty result." },
          ],
          responses: { 200: { description: "Matches, packs and suggestions.", content: json("SearchResponse", ex.search) }, ...errorResponses(["RATE_LIMITED", "INTERNAL"]) },
        },
      },
      "/api/emoji-facets": {
        get: {
          tags: ["packs"], operationId: "getFacets", summary: "The taxonomy and every catalog pack's tags",
          ...rateLimit(RATE_LIMITS.facets),
          responses: { 200: { description: "Taxonomy, thresholds and all packs (example trimmed to one facet and one pack).", content: json("FacetsResponse", ex.facets) },
            ...errorResponses(["RATE_LIMITED", "INTERNAL"]) },
        },
      },
      "/api/emoji-pack/by-id": {
        get: {
          tags: ["packs"], operationId: "packsOfEmojiIds", summary: "The pack of each custom emoji id",
          ...rateLimit(RATE_LIMITS.ids),
          parameters: [{ name: "ids", in: "query", required: true, schema: { type: "string" },
            description: "1 to 200 custom emoji ids (digits), comma-separated; duplicates collapse." }],
          responses: { 200: { description: "Packs of the ids Telegram knows.", content: json("ByIdResponse", ex.byId) },
            ...errorResponses(["BAD_REQUEST", ...RESOLVER_ERRORS]) },
        },
      },
      "/api/emoji-pack/{name}": {
        get: {
          tags: ["packs"], operationId: "getPack", summary: "One pack: its emoji, tags and look",
          ...rateLimit(RATE_LIMITS.pack),
          parameters: [pathParam("name", "PackName", "Pack short name (case as in Telegram; the answer gives the canonical spelling).")],
          responses: { 200: { description: "The pack. Packs outside the catalog work too, without tags.", content: json("PackResponse", ex.pack) },
            ...errorResponses(["PACK_NAME", "PACK_NOT_FOUND", "NOT_EMOJI_PACK", ...RESOLVER_ERRORS]) },
        },
      },
      "/api/emoji-pack/{name}/{id}": media("Picture of one emoji", "getEmojiPicture",
        "WEBP for a static emoji, the WEBM itself for a video emoji, the static thumbnail for an animated (TGS) one.",
        RATE_LIMITS.file, ["image/webp", "video/webm", "image/png", "image/jpeg"], [...MEDIA_ERRORS, "NO_PREVIEW"]),
      "/api/emoji-pack/{name}/{id}/still": media("Still thumbnail of a video emoji", "getEmojiStill",
        "A picture to show until the video plays (shares the picture limit).", RATE_LIMITS.file, ["image/webp", "image/png", "image/jpeg"], [...MEDIA_ERRORS, "NO_PREVIEW"]),
      "/api/emoji-pack/{name}/{id}/anim": media("Animation of an animated emoji", "getEmojiAnimation",
        "The TGS file as Telegram stores it (gzip-compressed Lottie); decompress and play it.", RATE_LIMITS.anim, ["application/x-tgsticker"], [...MEDIA_ERRORS, "NO_ANIMATION"]),
      [EMOJI_MCP_PATH]: mcpOperation(origin),
      [EMOJI_OPENAPI_PATH]: {
        get: {
          tags: ["catalog"], operationId: "getOpenApi", summary: "This document",
          description: "Static, built with the site; no rate limit.",
          responses: { 200: { description: "OpenAPI 3.1 document.", content: { "application/json": { schema: { type: "object" } } } } },
        },
      },
      [EMOJI_EXPORT_PATH]: {
        get: {
          tags: ["catalog"], operationId: "getCatalogExport", summary: "The whole catalog for offline use",
          description: `gzip-compressed NDJSON, one line per pack (schema CatalogLine): ${file.lines} packs, ${file.bytes} bytes, ETag ${file.etag} in this build. ` +
            "Built at build time from the committed catalog, static, no rate limit. Compare the ETag (a HEAD request or this document) with your copy before downloading again.",
          "x-size-bytes": file.bytes, "x-etag": file.etag, "x-lines": file.lines, "x-line-schema": ref("CatalogLine"), "x-url": exportUrl,
          responses: {
            200: {
              description: "The file. It is a .gz file, not a compressed transfer: gunzip it, then read one JSON object per line.",
              headers: {
                ETag: { description: "Strong ETag: a hash of the file's bytes. The size is x-size-bytes of this operation.", schema: { type: "string", const: file.etag } },
              },
              content: { "application/gzip": {} },
            },
          },
        },
      },
    },
    components: { schemas: schemas() },
  };
}
