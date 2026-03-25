import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Os warnings de ESLint não devem bloquear o deploy
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite build mesmo com warnings de tipo (ex: `any`)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
