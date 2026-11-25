// POST /api/mcp: the emoji library as a remote MCP server (Streamable HTTP, protocol 2025-11-25 and
// the older revisions the SDK negotiates). Stateless and read-only, no key: every POST gets its own
// server and transport, answers with one JSON body, and keeps nothing. GET (a server-sent event
// stream) and DELETE (ending a session) have nothing to serve without sessions: 405.
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { SITE_ORIGIN } from "@/content/site";
import { RATE_LIMITS, RATE_WINDOW_SECONDS } from "@/lib/emoji-api-contract";
import { emojiMcpServer } from "@/lib/emoji-mcp";
import { allow, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";
import { siteUrl } from "@/lib/site-url";

const BODY_MAX = 64 * 1024;

/** A browser sends Origin; a page of another site (or a DNS-rebound name) must not reach the tools. Native
 *  clients send none. The request's own Host is not trusted: under DNS rebinding it is the attacker's name. */
function foreignOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return origin !== null && origin !== SITE_ORIGIN && origin !== new URL(siteUrl()).origin;
}

function rpcError(status: number, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (foreignOrigin(req)) return rpcError(403, -32000, "Forbidden: requests from another site's pages are refused");
  const client = clientKey(req);
  if (!allow(`mcp:${client}`, RATE_LIMITS.mcp, RATE_WINDOW_SECONDS * 1000)) {
    return errorResponse(new ResolverError("RATE_LIMITED", 429, "too many MCP requests; retry in a minute", RATE_WINDOW_SECONDS));
  }
  const server = emojiMcpServer(client);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: BODY_MAX,
  });
  try {
    await server.connect(transport);
    const res = await transport.handleRequest(req);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Content-Type-Options", "nosniff");
    return res;
  } catch (err) {
    console.error("emoji mcp:", err instanceof Error ? err.name : "unknown error");
    return rpcError(500, -32603, "internal error");
  } finally {
    await server.close();
  }
}

function notAllowed() {
  const res = rpcError(405, -32000, "Method not allowed: this stateless server answers POST only");
  res.headers.set("Allow", "POST");
  return res;
}

export const GET = notAllowed;
export const DELETE = notAllowed;
