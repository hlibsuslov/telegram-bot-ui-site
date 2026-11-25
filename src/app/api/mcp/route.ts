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

/** Time for reading the body and answering; the platform's own limit is the backstop. A cancelled request
 *  inside a batch can leave the SDK waiting for a reply that never comes. */
const DEADLINE_MS = 25_000;

class Late extends Error {}

function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Late()), ms); });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

/** The body as text, or null when it is over BODY_MAX (read no further). */
async function readBody(req: Request): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks).toString("utf8");
      size += value.byteLength;
      if (size > BODY_MAX) return null;
      chunks.push(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

function rpcError(status: number, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

const rateLimited = () =>
  errorResponse(new ResolverError("RATE_LIMITED", 429, "too many MCP requests; retry in a minute", RATE_WINDOW_SECONDS));

interface Shape { requests: number; idBytes: number; problem?: string }

/** Requests (a method and an id) get answers; notifications and responses do not. */
function shape(message: unknown): Shape {
  const list = Array.isArray(message) ? message : [message];
  if (!list.length) return { requests: 0, idBytes: 0, problem: "an empty batch" };
  const ids = list
    .filter((m): m is { id: string | number } => !!m && typeof m === "object" && "method" in m && "id" in m && m.id !== null && m.id !== undefined)
    .map((m) => JSON.stringify(m.id));
  if (new Set(ids).size !== ids.length) return { requests: ids.length, idBytes: 0, problem: "a request id used twice in one batch" };
  const idBytes = ids.reduce((n, id) => n + Buffer.byteLength(id), 0);
  if (idBytes > MCP_RESPONSE_MAX / 4) return { requests: ids.length, idBytes, problem: "request ids too long" };
  return { requests: ids.length, idBytes };
}

export async function POST(req: Request) {
  if (foreignOrigin(req)) return rpcError(403, -32000, "Forbidden: requests from another site's pages are refused");
  const client = clientKey(req);
  if (!allow(`mcp:${client}`, RATE_LIMITS.mcp, RATE_WINDOW_SECONDS * 1000)) return rateLimited();
  const tooLarge = () => rpcError(413, -32000, `Payload too large: the body is limited to ${BODY_MAX} bytes`);
  if (Number(req.headers.get("content-length")) > BODY_MAX) return tooLarge();
  const deadline = Date.now() + DEADLINE_MS;
  let text: string | null;
  try {
    text = await within(readBody(req), DEADLINE_MS);
  } catch {
    return rpcError(408, -32000, "Request Timeout: the body could not be read in time");
  }
  if (text === null) return tooLarge();
  let message: unknown;
  try {
    message = JSON.parse(text);
  } catch {
    return rpcError(400, -32700, "Parse error: Invalid JSON");
  }
  const batch = Array.isArray(message);
  const revision = req.headers.get("mcp-protocol-version") ?? BATCH_REVISION;
  if (batch && (message as unknown[]).length > 1 && revision !== BATCH_REVISION) {
    return rpcError(400, -32600, `Invalid Request: protocol ${revision} sends one JSON-RPC message per POST`);
  }
  const { requests, idBytes, problem } = shape(message);
  if (problem) return rpcError(400, -32600, `Invalid Request: ${problem}`);
  // Every request in a batch is one MCP request against the limit, as if it came in its own POST.
  for (let i = 1; i < requests; i++) {
    if (!allow(`mcp:${client}`, RATE_LIMITS.mcp, RATE_WINDOW_SECONDS * 1000)) return rateLimited();
  }
  const server = emojiMcpServer(client, { messages: requests, reserve: idBytes });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    const res = await within(transport.handleRequest(req, { parsedBody: message }), Math.max(0, deadline - Date.now()));
    if (!res.body) return res; // 202 for notifications only
    // Each tool answer is cut to its share; other answers (tools/list) can still push the whole past the limit.
    const body = await res.text();
    if (Buffer.byteLength(body) > MCP_RESPONSE_MAX) {
      return rpcError(400, -32600, `Invalid Request: the answers exceed ${MCP_RESPONSE_MAX / 1024} KB; send fewer messages per POST`);
    }
    let out = body;
    if (batch && res.ok) {
      const parsed: unknown = JSON.parse(body);
      if (!Array.isArray(parsed)) out = JSON.stringify([parsed]); // a batch is answered with a batch
    }
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(out, { status: res.status, headers });
  } catch (err) {
    if (err instanceof Late) return rpcError(504, -32000, "Gateway Timeout: the answer took too long");
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
