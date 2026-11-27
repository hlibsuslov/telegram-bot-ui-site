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

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
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

export const config = { matcher: ["/", "/emoji/:name"] };
