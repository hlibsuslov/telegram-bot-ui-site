import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
