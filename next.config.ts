import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true,
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
  },
  compiler: {
    removeConsole: false,
  },
  // Reduce page prefetch size
  images: {
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
