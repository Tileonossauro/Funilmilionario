import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: false,
  experimental: { serverActions: { bodySizeLimit: '8mb' } },
}

export default nextConfig
