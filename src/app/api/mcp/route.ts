// POST /api/mcp: the emoji library as a remote MCP server (Streamable HTTP, protocol 2025-11-25 and
// the older revisions the SDK negotiates). Stateless and read-only, no key: every POST gets its own
// server and transport, answers with one JSON body, and keeps nothing. GET (a server-sent event
// stream) and DELETE (ending a session) have nothing to serve without sessions: 405.
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { SITE_ORIGIN } from "@/content/site";
import { MCP_RESPONSE_MAX, RATE_LIMITS, RATE_WINDOW_SECONDS } from "@/lib/emoji-api-contract";
import { emojiMcpServer } from "@/lib/emoji-mcp";
import { allow, clientKey, errorResponse, ResolverError } from "@/lib/emoji-pack";
import { siteUrl } from "@/lib/site-url";

const BODY_MAX = 64 * 1024;
/** The only protocol revision with JSON-RPC batches, and the one a request without the version header speaks. */
const BATCH_REVISION = "2025-03-26";

/** A browser sends Origin; a page of another site (or a DNS-rebound name) must not reach the tools. Native
 *  clients send none. The request's own Host is not trusted: under DNS rebinding it is the attacker's name. */
function foreignOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return origin !== null && origin !== SITE_ORIGIN && origin !== new URL(siteUrl()).origin;
}

/** The body as text, or null when it is over BODY_MAX (read no further). */
async function readBody(req: Request): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks).toString("utf8");
    size += value.byteLength;
    if (size > BODY_MAX) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
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
  const text = await readBody(req);
  if (text === null) return rpcError(413, -32000, `Payload too large: the body is limited to ${BODY_MAX} bytes`);
  let message: unknown;
  try {
    message = JSON.parse(text);
  } catch {
    return rpcError(400, -32700, "Parse error: Invalid JSON");
  }
  const messages = Array.isArray(message) ? message.length : 1;
  const revision = req.headers.get("mcp-protocol-version") ?? BATCH_REVISION;
  if (messages > 1 && revision !== BATCH_REVISION) {
    return rpcError(400, -32600, `Invalid Request: protocol ${revision} sends one JSON-RPC message per POST`);
  }
  const server = emojiMcpServer(client, { messages });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    let res = await transport.handleRequest(req, { parsedBody: message });
    if (messages > 1) {
      // Each tool answer is cut to its share; other answers (tools/list) can still push the whole past the limit.
      const body = await res.text();
      if (Buffer.byteLength(body) > MCP_RESPONSE_MAX) {
        return rpcError(400, -32600, `Invalid Request: the answers to this batch exceed ${MCP_RESPONSE_MAX / 1024} KB; send fewer messages per POST`);
      }
      res = new Response(body, { status: res.status, headers: res.headers });
    }
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
