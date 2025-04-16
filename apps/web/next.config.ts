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
  // Add webpack config for pdf.js worker
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    return config;
  },
  // experimental: {
  //   webpackBuildWorker: true,
  // },
  // React 19 compatibility settings
  reactStrictMode: true,
};

export default nextConfig;
