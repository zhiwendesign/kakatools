/** @type {import('next').NextConfig} */
const nextConfig = {
  // 根据环境调整输出模式
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  
  // 静态导出时禁用图片优化（使用 unoptimized）
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
    ],
  },
  
  // 统一部署模式：开发和生产都使用相对路径（同域）
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  
  // 尾部斜杠确保静态路由正常工作
  trailingSlash: true,
  
  // 禁用 SWC 压缩，使用 Babel 编译（解决 macOS 系统策略问题）
  swcMinify: false,
}

module.exports = nextConfig

