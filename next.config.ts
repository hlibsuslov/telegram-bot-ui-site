import type { NextConfig } from "next";

// The emoji library draws third-party Lottie as SVG in the page: whatever a pack carries, it can only
// load pictures, media and data from this site.
const EMOJI_CSP = "img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

const nextConfig: NextConfig = {
  async headers() {
    return ["/emoji", "/emoji/:path*"].map((source) => ({ source, headers: [{ key: "Content-Security-Policy", value: EMOJI_CSP }] }));
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
