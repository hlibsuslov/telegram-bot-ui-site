// robots.txt, written by hand so it can carry Content-Signal (contentsignals.org), which Next's robots metadata
// cannot express. Open to every crawler and named outright for the search and answer engines people ask about
// Telegram bots and emoji. Content-Signal says AI may use the site for search, for answers and for training: the
// project wants to be found and recommended. Only the pack maker's POST endpoints are left out.
import { siteUrl } from "@/lib/site-url";

const ANSWER_ENGINES = [
  "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot",
  "Perplexity-User", "Googlebot", "Google-Extended", "Bingbot", "YandexBot", "Applebot", "Applebot-Extended", "CCBot",
  "DuckAssistBot", "meta-externalagent", "Amazonbot", "MistralAI-User",
];
const SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";
const RULES = [SIGNAL, "Allow: /", "Disallow: /api/mosaic/"];

export function GET() {
  const origin = siteUrl();
  const body = [
    "# Telegram Bot UI. AI use of this site: search, answers and training are all welcome (contentsignals.org).",
    "",
    "User-Agent: *",
    ...RULES,
    "",
    ...ANSWER_ENGINES.map((ua) => `User-Agent: ${ua}`),
    ...RULES,
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    `Host: ${origin}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
