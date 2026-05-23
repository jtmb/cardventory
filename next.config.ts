import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  // tesseract.js and sharp use __dirname-relative paths / native binaries;
  // bundling them breaks those paths, so keep them as native node_modules requires.
  serverExternalPackages: ["tesseract.js", "sharp"],
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
      { protocol: "https", hostname: "**.ebayimg.com" },
      { protocol: "https", hostname: "**.ebay.com" },
      { protocol: "https", hostname: "**.sportscardinvestor.com" },
      { protocol: "https", hostname: "**.cardladder.com" },
      { protocol: "https", hostname: "**.sportscardspro.com" },
      { protocol: "https", hostname: "i.ebayimg.com" },
      { protocol: "https", hostname: "**.pristineauction.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.myslabs.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
};

export default nextConfig;
