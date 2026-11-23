import type { NextConfig } from "next";
import { OLD_HOST, SITE_ORIGIN } from "./src/content/site";

const nextConfig: NextConfig = {
  // The site moved to SITE_ORIGIN. Pages on the old vercel.app address redirect for good; /api/* stays
  // served there, because bot-ui Studio installs already out there call the emoji resolver at that host
  // and refuse redirects.
  async redirects() {
    const has = [{ type: "host" as const, value: OLD_HOST }];
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
    },
  },
};

export default nextConfig;
