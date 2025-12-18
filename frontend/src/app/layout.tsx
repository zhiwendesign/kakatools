import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '卡卡资源库 - AI工具、设计资源、学习资料一站式平台',
  description:
    '卡卡资源库提供最全的AI工具集合、设计素材、学习资源。包括ChatGPT、Midjourney、Claude等AI工具，Figma、Canva等设计工具，以及编程、设计等学习资料，助力创作者提升效率。',
  keywords:
    'AI工具,人工智能,设计资源,学习资料,ChatGPT,Midjourney,卡卡资源库,在线工具,创意工具,编程学习,设计工具',
  authors: [{ name: '卡卡资源库' }],
  openGraph: {
    type: 'website',
    title: '卡卡资源库 - AI工具、设计资源、学习资料一站式平台',
    description:
      '汇集最优质的AI工具、设计资源和学习资料，帮助创作者提升工作效率和技能水平。',
    siteName: '卡卡资源库',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: '卡卡资源库 - AI工具、设计资源、学习资料一站式平台',
    description:
      '汇集最优质的AI工具、设计资源和学习资料，帮助创作者提升工作效率和技能水平。',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}

