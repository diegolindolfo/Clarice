import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Permite build mesmo com warnings de tipo (ex: `any`)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
