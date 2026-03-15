import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.bienici.com" },
      { protocol: "https", hostname: "**.pap.fr" },
      { protocol: "https", hostname: "**.leboncoin.fr" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 24h image cache
    deviceSizes: [640, 750, 1080],
    imageSizes: [96, 256, 384],
  },
};

export default nextConfig;
