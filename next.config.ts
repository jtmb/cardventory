import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  // tesseract.js and sharp use __dirname-relative paths / native binaries;
  // bundling them breaks those paths, so keep them as native node_modules requires.
  serverExternalPackages: ["tesseract.js", "sharp"],
  // standalone output only copies statically-traced files; tesseract.js worker
  // scripts use require('..') at runtime inside worker_threads which the tracer
  // misses — force-include the whole package so the relative require resolves.
  outputFileTracingIncludes: {
    "**": [
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  experimental: {
  },
  async headers() {
    return [
      {
        // Uploaded card images — UUID filenames never change, safe to cache forever
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  images: {
    minimumCacheTTL: 86400, // cache optimised remote images for 24 h
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "localhost" },
    ],
  },
};

export default nextConfig;
