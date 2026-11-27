import { type NextRequest, NextResponse } from "next/server";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, EMOJI_MOSAIC_PATH, EMOJI_SHARE_IMAGE_PATH, emojiPackPath } from "@/lib/emoji-links";
import { listedPackName } from "@/lib/emoji-pack-list";

// Library pages that are not packs, including the Russian and Ukrainian landings (/emoji/ru, /emoji/uk).
const libraryResources = new Set([EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, EMOJI_MOSAIC_PATH, "/emoji/ru", "/emoji/uk"]);

/** An agent that asks for Markdown first (Accept: text/markdown before text/html) gets the landing as Markdown. */
function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const md = accept.indexOf("text/markdown");
  const html = accept.indexOf("text/html");
  return md !== -1 && (html === -1 || md < html);
}

/** RFC 9727 API catalog (RFC 9264 linkset): the emoji library's HTTP API and its MCP server. */
function apiCatalog(origin: string): Response {
  const linkset = {
    linkset: [
      {
        anchor: `${origin}/api/`,
        "service-desc": [{ href: `${origin}/api/emoji-openapi.json`, type: "application/openapi+json" }],
        "service-doc": [{ href: `${origin}/emoji/api-docs`, type: "text/html" }],
        describedby: [{ href: `${origin}/llms.txt`, type: "text/plain" }],
      },
      {
        anchor: `${origin}/api/mcp`,
        "service-desc": [{ href: `${origin}/.well-known/mcp/server.json`, type: "application/json" }],
        "service-doc": [{ href: `${origin}/emoji/api-docs#mcp`, type: "text/html" }],
      },
    ],
  };
  return new Response(JSON.stringify(linkset, null, 2), {
    headers: { "Content-Type": "application/linkset+json; charset=utf-8", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
  });
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/.well-known/api-catalog") return apiCatalog(request.nextUrl.origin);
  if (path === "/") {
    const res = wantsMarkdown(request.headers.get("accept")) ? NextResponse.rewrite(new URL("/index.md", request.url)) : NextResponse.next();
    res.headers.set("Vary", "Accept");
    return res;
  }
  if (path === "/emoji/share-image") {
    return NextResponse.rewrite(new URL(EMOJI_SHARE_IMAGE_PATH, request.url));
  }
  if (libraryResources.has(path)) return NextResponse.next();

  let name: string | undefined;
  try {
    name = listedPackName(decodeURIComponent(path.slice("/emoji/".length)));
  } catch {
    // Malformed URL encoding is an unrecognized slug.
  }
  if (!name) {
    // Validate unlisted slugs before the App Router starts streaming a success response.
    return NextResponse.rewrite(new URL("/404", request.url), { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }
  if (path !== emojiPackPath(name)) {
    const url = request.nextUrl.clone();
    url.pathname = emojiPackPath(name);
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/.well-known/api-catalog", "/emoji/:name"] };
