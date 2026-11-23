import { type NextRequest, NextResponse } from "next/server";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, EMOJI_SHARE_IMAGE_PATH, emojiPackPath } from "@/lib/emoji-links";
import { listedPackName } from "@/lib/emoji-pack-list";

const libraryResources = new Set([EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, EMOJI_SHARE_IMAGE_PATH]);

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
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

export const config = { matcher: "/emoji/:name" };
