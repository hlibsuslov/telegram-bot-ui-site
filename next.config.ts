import type { NextConfig } from "next";
import { OLD_HOST, SITE_ORIGIN } from "./src/content/site";

// The emoji library draws third-party Lottie as SVG in the page: whatever a pack carries, it can only
// load pictures, media and data from this site.
const EMOJI_CSP = "img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

// The agent docs the skill generates (scripts/sync_agent_docs.py) are served from public/. Next sets the right
// type for them but writes the charset in capitals; this pins the exact value agents and crawlers expect.
const AGENT_DOCS = [
  { source: "/agents.md", type: "text/markdown; charset=utf-8" },
  { source: "/llms.txt", type: "text/plain; charset=utf-8" },
  { source: "/llms-full.txt", type: "text/plain; charset=utf-8" },
];

/** What the site publishes for agents: only resources that exist. */
const AGENT_LINKS = [
  '</index.md>; rel="alternate"; type="text/markdown"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</agents.md>; rel="service-doc"; type="text/markdown"',
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</api/emoji-openapi.json>; rel="service-desc"; type="application/openapi+json"',
  '</emoji/api-docs>; rel="service-doc"; type="text/html"',
].join(", ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      ...AGENT_DOCS.map(({ source, type }) => ({ source, headers: [{ key: "Content-Type", value: type }] })),
      // RFC 8288 links on the homepage to what the site publishes for agents. Set here rather than in the proxy:
      // the page render writes its own Link header (font preloads) over one set there.
      { source: "/", headers: [{ key: "Link", value: AGENT_LINKS }] },
      ...["/emoji", "/emoji/:path*"].map((source) => ({ source, headers: [{ key: "Content-Security-Policy", value: EMOJI_CSP }] })),
      ...["/api/emoji-search", "/api/emoji-pack/:name"].map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex" }] })),
    ];
  },
  // The site moved to SITE_ORIGIN. Pages on the old vercel.app address redirect for good; /api/* stays
  // served there, because bot-ui Studio installs already out there call the emoji resolver at that host
  // and refuse redirects.
  async redirects() {
    // `value` is a regular expression: escape the dots so only this exact host matches.
    const has = [{ type: "host" as const, value: OLD_HOST.replace(/\./g, "\\.") }];
    return [
      { source: "/", has, destination: SITE_ORIGIN, permanent: true },
      { source: "/:path((?!api/).+)", has, destination: `${SITE_ORIGIN}/:path`, permanent: true },
    ];
  },
  // The local preview is opened through both localhost and the IPv4 loopback address.
  allowedDevOrigins: ["127.0.0.1"],
  // The mosaic check stacks tiles with ffmpeg; ship the binary with the one route that runs it.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: { "/api/mosaic/finish": ["./node_modules/ffmpeg-static/ffmpeg*"] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
      // Plain-text content files (the emoji library's pack list) import as their text.
      "*.txt": {
        type: "raw",
      },
    },
  },
};

export default nextConfig;
