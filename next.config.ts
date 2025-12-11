import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  experimental: {
    outputFileTracingIncludes: {
      "/api/scrape": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    },
  },
};

export default nextConfig;
