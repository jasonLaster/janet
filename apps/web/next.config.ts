/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (
    config: any,
    { isServer, nextRuntime }: { isServer: boolean; nextRuntime?: string }
  ) => {
    config.cache = false;

    return config;
  },
};

export default nextConfig;
