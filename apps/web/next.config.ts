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
    // Exclude canvas from server bundle
    if (isServer && nextRuntime === "nodejs") {
      config.externals.push("canvas");
    }

    return config;
  },
};

export default nextConfig;
