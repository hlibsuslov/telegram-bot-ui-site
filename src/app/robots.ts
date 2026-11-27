import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Open to every crawler, and named outright for the search and answer engines people ask about Telegram emoji:
// OpenAI (ChatGPT search, browsing, training), Anthropic, Perplexity, Google, Bing (which ChatGPT search also
// draws on), Yandex, Apple, Common Crawl, DuckDuckGo and Meta. Only the pack maker's POST endpoints are left out.
const ANSWER_ENGINES = [
  "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot",
  "Perplexity-User", "Googlebot", "Google-Extended", "Bingbot", "YandexBot", "Applebot", "Applebot-Extended", "CCBot",
  "DuckAssistBot", "meta-externalagent", "Amazonbot", "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/mosaic/"];
  return {
    rules: [{ userAgent: ANSWER_ENGINES, allow: "/", disallow }, { userAgent: "*", allow: "/", disallow }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
