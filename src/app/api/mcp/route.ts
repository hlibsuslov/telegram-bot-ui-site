// POST /api/mcp: the emoji library as a remote MCP server (Streamable HTTP, protocol 2025-11-25 and
// the older revisions the SDK negotiates). Stateless and read-only, no key: every POST gets its own
// server and transport, answers with one JSON body, and keeps nothing. GET (a server-sent event
// stream) and DELETE (ending a session) have nothing to serve without sessions: 405.
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { RATE_LIMITS, RATE_WINDOW_SECONDS } from "@/lib/emoji-api-contract";
import { emojiMcpServer } from "@/lib/emoji-mcp";
import { allow, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";

const BODY_MAX = 64 * 1024;

export async function POST(req: Request) {
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
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "internal error" } }, { status: 500, headers: { "Cache-Control": "no-store" } });
  } finally {
    await server.close();
  }
}

function notAllowed() {
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Method not allowed: this stateless server answers POST only" } },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}

export const GET = notAllowed;
export const DELETE = notAllowed;
