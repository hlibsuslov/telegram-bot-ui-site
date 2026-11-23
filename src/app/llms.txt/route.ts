import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH, EMOJI_LIBRARY_PATH } from "@/lib/emoji-links";
import { siteUrl } from "@/lib/site-url";

export function GET() {
  const origin = siteUrl();
  const body = [
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
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
