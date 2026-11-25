import { MCP_RESPONSE_MAX, RATE_LIMITS } from "@/lib/emoji-api-contract";
import { catalogExport } from "@/lib/emoji-export";
import { catalogVersion, facetCodes } from "@/lib/emoji-facets";
import { EMOJI_API_DOCS_PATH, EMOJI_EXPORT_PATH, EMOJI_GUIDE_PATH, EMOJI_LIBRARY_PATH, EMOJI_MCP_PATH, EMOJI_OPENAPI_PATH } from "@/lib/emoji-links";
import { siteUrl } from "@/lib/site-url";
import skillDocs from "@/content/agents-llms.txt";

/** The library section sits under the skill's own llms.txt (synced from the skill), one heading level down. */
const demote = (text: string) => text.replace(/^(#{1,5}) /gm, "#$1 ");

export function GET() {
  const origin = siteUrl();
  const file = catalogExport();
  const codes = Object.entries(facetCodes).map(([code, facet]) => `${code}=${facet}`).join(", ");
  const library = [
    "# Telegram Emoji Library",
    "",
    "> Find Telegram premium emoji packs, resolve custom emoji IDs, and copy snippets for bot messages and buttons.",
    "",
    "## Documentation",
    "",
    `- [JSON API and ID lookup](${origin}${EMOJI_API_DOCS_PATH}): Endpoints, parameters, responses, errors, and source links.`,
    `- [Custom emoji guide](${origin}${EMOJI_GUIDE_PATH}): Example sendMessage payloads for a message and an inline keyboard.`,
    `- [Pack catalog](${origin}${EMOJI_LIBRARY_PATH}): Search packs and browse their canonical pages.`,
    "",
    "## Emoji library API for agents",
    "",
    `- [OpenAPI 3.1 contract](${origin}${EMOJI_OPENAPI_PATH}): every endpoint with parameters, response schemas, error status and code, rate limits, and an example.`,
    `- [Catalog export](${origin}${EMOJI_EXPORT_PATH}): every pack in one gzip NDJSON file, ${file.lines} lines, ${file.bytes} bytes, ETag ${file.etag}.`,
    `- [Remote MCP server](${origin}${EMOJI_MCP_PATH}): the same library as MCP tools (Streamable HTTP, no key).`,
    "",
    `Read-only GET, no key. Keep emoji ids as strings. Resolve relative paths (pageUrl, preview, animation, still) against ${origin}. ` +
      `Every JSON answer carries the catalog version: taxonomy ${catalogVersion.taxonomy}, generated ${catalogVersion.generated} ` +
      "(the facets answer has it at taxonomy.version). Errors are {ok:false, error:{code, message}}: branch on code.",
    "",
    "### Search",
    "",
    `GET ${origin}/api/emoji-search?q=<words or an emoji>&pack=<name>: emoji (up to 60, or 200 within one pack) and packs, best first, each with its facets and pageUrl; suggest.didYouMean when nothing matched.`,
    "",
    "### Filter by facet:value",
    "",
    "Put facet:value tokens in q, alone or with words: `q=settings style:outline fit:adaptive`, `q=use:shop color:blue`, `q=motion:static`. " +
      `A value is its id or its English or Russian label. GET ${origin}/api/emoji-facets lists the facets, their values and every pack's tags ` +
      "as [value, confidence]. The answer lists applied filters in filters and unreadable ones in unknownFilters.",
    "",
    "### Fetch a pack",
    "",
    `GET ${origin}/api/emoji-pack/<name>: title, up to 200 emoji (id, fallback, format, adaptive, preview/animation/still paths, facets), ` +
      `the pack's facets, look and compatible packs. GET ${origin}/api/emoji-pack/by-id?ids=<id,id>: the pack of each id. ` +
      'In a message: <tg-emoji emoji-id="<id>"><fallback></tg-emoji> with parse_mode HTML; on a button: icon_custom_emoji_id.',
    "",
    "### Pick a family",
    "",
    "Use packs drawn alike in one bot. Start with the pack that covers the meanings you need, then add packs from its compatible list " +
      "([name, similarity], 0.75 and up, most similar first) that share its look (line_weight, fill, perspective, shadows) and fit. " +
      "fit:adaptive packs repaint in the text colour and suit light and dark themes; prefer them for interface icons.",
    "",
    "### Use the export offline",
    "",
    `Download ${origin}${EMOJI_EXPORT_PATH} once, gunzip it and read one JSON object per line: name, title (null until the catalog data has titles), ` +
      "category, count, meanings, facets, look, description (when present: en, ru, uk with what, for, not_for), compatible, " +
      "taxonomy, generated, and emoji: [{id, codes}]. " +
      `codes is "c:blue@9,white@6;s:outline@6": facet code, value, confidence x10; codes ${codes}. ` +
      "An emoji without its own style or topic takes its pack's. Filter and rank packs locally, then fetch only the packs you use. " +
      "Before downloading again, compare the ETag of a HEAD request with your copy's.",
    "",
    "### Remote MCP server",
    "",
    `${origin}${EMOJI_MCP_PATH} speaks MCP over Streamable HTTP (protocol 2025-11-25; older revisions are negotiated). Stateless, read-only, no key: ` +
      "POST JSON-RPC with Accept: application/json, text/event-stream; GET and DELETE answer 405. Tools: " +
      "emoji_search (query with words and facet:value filters, optional pack), emoji_pack (name), emoji_facets (the taxonomy, plus the tags of the packs named), " +
      "emoji_rank_packs (style, color, palette, topic, mood, role, use, require, motion, theme, top), " +
      "emoji_pick_family (slots such as home, back, settings, plus the same tags: one pack and its icon map), emoji_by_id (ids). " +
      "A tool answers what its HTTP endpoint answers, as JSON text; failures are isError results with the same {ok:false, error:{code, message}} body. " +
      `Answers stay under ${MCP_RESPONSE_MAX / 1024} KB: a larger one keeps the first part of each list and says so in truncated.`,
    "",
    `Claude Code: claude mcp add --transport http telegram-emoji ${origin}${EMOJI_MCP_PATH}`,
    `claude.ai: Settings > Connectors > Add custom connector, name it, paste ${origin}${EMOJI_MCP_PATH}, no OAuth. ` +
      "On Team and Enterprise plans an owner adds it for the organization first.",
    "",
    "### Rate limits",
    "",
    `Per client IP, per endpoint and per server instance, per minute: search ${RATE_LIMITS.search}, facets ${RATE_LIMITS.facets}, ` +
      `pack ${RATE_LIMITS.pack}, by-id ${RATE_LIMITS.ids}, pictures and stills ${RATE_LIMITS.file}, animations ${RATE_LIMITS.anim}, ` +
      `MCP requests ${RATE_LIMITS.mcp} (each MCP tool call also counts against its endpoint: search, pack, by-id, or facets for the tag tools). ` +
      "Over the limit: 429 RATE_LIMITED; wait Retry-After seconds when present, else a minute. CDN-cached answers do not count. " +
      "The OpenAPI document and the export are static and have no limit: prefer the export to many pack or facets requests.",
    "",
  ].join("\n");
  const body = `${skillDocs.replace(/\r\n/g, "\n").trimEnd()}\n\n${demote(library)}`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
