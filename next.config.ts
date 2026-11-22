import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  redirects() {
    return [
      { source: "/setoran", destination: "/hafalan", permanent: false },
      { source: "/latihan", destination: "/hafalan", permanent: false },
      { source: "/aksesibilitas", destination: "/tentang#aksesibilitas", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
