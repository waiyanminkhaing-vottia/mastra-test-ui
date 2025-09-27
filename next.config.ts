import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  serverExternalPackages: ['@mastra/*'],
};

export default nextConfig;
