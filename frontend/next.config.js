/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出模式 - 生成纯 HTML/CSS/JS 文件
  output: 'export',
  
  // 静态导出时禁用图片优化（使用 unoptimized）
  images: {
    unoptimized: true,
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
}

module.exports = nextConfig

