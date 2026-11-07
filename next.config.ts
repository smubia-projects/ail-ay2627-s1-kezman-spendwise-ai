import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Frontend only: the API lives in server/ (Cloud Run) and is reached via NEXT_PUBLIC_API_BASE.
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
