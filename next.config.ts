import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress pdf-parse canvas warnings in server components
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        "canvas",
      ];
    }
    return config;
  },
};

export default nextConfig;
