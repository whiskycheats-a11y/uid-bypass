import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only keep production-stable config
  compiler: {
    removeConsole: false,
  },
  // Reduce page prefetch size
  images: {
    minimumCacheTTL: 86400,
  },
  // ⚠️ Server External Packages: ensure Prisma + bcryptjs are available
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  outputFileTracingIncludes: {
    '/api/**/*': ['./backend_data/**/*'],
  },
  async rewrites() {
    return [
      {
        source: '/api.php',
        destination: '/api',
      },
    ];
  },
};

export default nextConfig;
