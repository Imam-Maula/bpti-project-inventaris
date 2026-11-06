import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  images: {
    unoptimized: true,
  },
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // 1. Matikan disk cache Webpack dev agar tidak terjadi lonjakan serialisasi gzip (.pack.gz_) ke disk
      config.cache = false;

      // 2. Bersihkan EvalSourceMapDevToolPlugin agar payload bundel client (main-app.js & page.js)
      //    tidak membengkak 3x lipat oleh string source map base64 di memori renderer browser
      if (Array.isArray(config.plugins)) {
        config.plugins = config.plugins.filter((plugin: unknown) => {
          const name = (plugin as { constructor?: { name?: string } })?.constructor?.name;
          return (
            name !== "EvalSourceMapDevToolPlugin" &&
            name !== "SourceMapDevToolPlugin" &&
            name !== "MemoryWithGcCachePlugin"
          );
        });
      }
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
