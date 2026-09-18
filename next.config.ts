import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Empacota só o necessário para rodar: a imagem Docker fica pequena e não
  // precisa de node_modules no servidor. Em plataformas gerenciadas é ignorado.
  output: 'standalone',
  typedRoutes: false,
  experimental: { serverActions: { bodySizeLimit: '8mb' } },
}

export default nextConfig
