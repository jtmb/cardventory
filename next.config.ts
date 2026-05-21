import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  experimental: {
  },
  images: {
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
