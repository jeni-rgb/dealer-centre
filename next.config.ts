import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  serverExternalPackages: ["bwip-js", "pdf-lib", "square"],
};

export default nextConfig;
