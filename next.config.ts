import type { NextConfig } from "next";
import { OLD_HOST, SITE_ORIGIN } from "./src/content/site";

// The emoji library draws third-party Lottie as SVG in the page: whatever a pack carries, it can only
// load pictures, media and data from this site.
const EMOJI_CSP = "img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

const nextConfig: NextConfig = {
  async headers() {
    return [
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
