/**
 * 数据导入脚本
 * 将 JSON 文件中的数据导入到 SQLite 数据库
 * 
 * 使用方法: node import-data.js
 */

const fs = require('fs');
const path = require('path');

// 示例数据
const SAMPLE_DATA = {
  AIGC: {
    filters: [
      { label: '全部', tag: 'All' },
      { label: '卡卡推荐', tag: '卡卡推荐' },
      { label: '大语言模型', tag: 'LLM' },
      { label: '图像生成', tag: 'Image Gen' },
      { label: '视频生成', tag: 'Video' },
      { label: '音频处理', tag: 'Audio' },
      { label: '编程工具', tag: 'Coding' },
      { label: '搜索研究', tag: 'Search' },
    ],
    resources: [
      {
        id: 'ai-1',
        title: 'ChatGPT',
        description: 'OpenAI开发的强大对话AI助手，在文本生成和理解方面表现出色。',
        tags: ['LLM', 'Chat', 'OpenAI'],
        imageUrl: 'https://picsum.photos/id/100/600/400',
        link: 'https://chat.openai.com',
        featured: true,
      },
      {
        id: 'ai-2',
        title: 'Claude',
        description: 'Anthropic最新模型，在编程和推理任务中表现出色。',
        tags: ['LLM', 'Coding', 'Reasoning'],
        imageUrl: 'https://picsum.photos/id/20/600/400',
        link: 'https://claude.ai',
        featured: true,
      },
      {
        id: 'ai-3',
        title: 'Midjourney',
        description: '基于文本提示生成高质量艺术风格图像。',
        tags: ['Image Gen', 'Art', 'Discord'],
        imageUrl: 'https://picsum.photos/id/16/600/400',
        link: 'https://midjourney.com',
        featured: false,
      },
      {
        id: 'ai-4',
        title: 'Gemini',
        description: '谷歌最先进的AI模型，支持多模态功能。',
        tags: ['LLM', 'Multimodal', 'Google'],
        imageUrl: 'https://picsum.photos/id/1/600/400',
        link: 'https://gemini.google.com',
        featured: true,
      },
    ],
  },
  UXTips: {
    filters: [
      { label: '全部', tag: 'All' },
      { label: '卡卡推荐', tag: '卡卡推荐' },
      { label: 'UI/UX设计', tag: 'UI/UX' },
      { label: '3D与动效', tag: '3D' },
      { label: '无代码', tag: 'No-Code' },
      { label: '灵感素材', tag: 'Inspiration' },
      { label: '生产力工具', tag: 'Productivity' },
      { label: '实用工具', tag: 'Tools' },
    ],
    resources: [
      {
        id: 'ux-1',
        title: 'Figma',
        description: '协作式界面设计工具，支持实时多人编辑。',
        tags: ['UI/UX', 'Design', 'Collaboration'],
        imageUrl: 'https://picsum.photos/id/30/600/400',
        link: 'https://figma.com',
        featured: true,
      },
      {
        id: 'ux-2',
        title: 'Framer',
        description: '强大的原型设计和网站构建工具。',
        tags: ['UI/UX', 'No-Code', 'Prototype'],
        imageUrl: 'https://picsum.photos/id/31/600/400',
        link: 'https://framer.com',
        featured: true,
      },
      {
        id: 'ux-3',
        title: 'Spline',
        description: '3D 设计工具，创建交互式 3D 网页体验。',
        tags: ['3D', 'Interactive', 'Web'],
        imageUrl: 'https://picsum.photos/id/32/600/400',
        link: 'https://spline.design',
        featured: false,
      },
    ],
  },
  Learning: {
    filters: [
      { label: '全部', tag: 'All' },
      { label: '卡卡推荐', tag: '卡卡推荐' },
      { label: '教程', tag: 'Tutorial' },
      { label: '课程', tag: 'Course' },
      { label: '文档', tag: 'Documentation' },
      { label: '实践', tag: 'Practice' },
      { label: '资源', tag: 'Resource' },
    ],
    resources: [
      {
        id: 'learn-1',
        title: 'React 官方文档',
        description: 'React 官方学习文档，最权威的 React 学习资源。',
        tags: ['Documentation', 'React', 'Frontend'],
        imageUrl: 'https://picsum.photos/id/40/600/400',
        link: 'https://react.dev',
        featured: true,
      },
      {
        id: 'learn-2',
        title: 'Next.js 教程',
        description: 'Next.js 官方交互式教程，从零开始学习。',
        tags: ['Tutorial', 'Next.js', 'React'],
        imageUrl: 'https://picsum.photos/id/41/600/400',
        link: 'https://nextjs.org/learn',
        featured: true,
      },
    ],
  },
  '星芒学社': {
    filters: [
      { label: 'All', tag: 'All' },
      { label: 'Exclusive', tag: 'Exclusive' },
      { label: 'Workshops', tag: 'Workshops' },
      { label: 'Mentorship', tag: 'Mentorship' },
    ],
    resources: [
      {
        id: 'star-1',
        title: 'AI 提示词工程实战',
        description: '深入学习 AI 提示词技巧，提升 AI 工具使用效率。',
        tags: ['Exclusive', 'AI', 'Prompt'],
        imageUrl: 'https://picsum.photos/id/50/600/400',
        link: '#',
        featured: true,
      },
    ],
  },
};

// 导入数据
async function importData() {
  console.log('🚀 开始导入数据到 SQLite 数据库...\n');

  // 动态加载数据库模块（确保数据库初始化）
  const { resources, filters } = require('./db');

  let totalResources = 0;
  let totalFilters = 0;

  for (const [category, data] of Object.entries(SAMPLE_DATA)) {
    console.log(`📁 导入分类: ${category}`);

    // 导入过滤器
    if (data.filters && data.filters.length > 0) {
      const filterCount = filters.upsertMany(data.filters, category);
      console.log(`  ✓ 导入 ${filterCount} 个过滤器`);
      totalFilters += filterCount;
    }

    // 导入资源
    if (data.resources && data.resources.length > 0) {
      const resourcesWithCategory = data.resources.map((r, index) => ({
        ...r,
        category,
        sortOrder: index,
      }));
      const resourceCount = resources.upsertMany(resourcesWithCategory);
      console.log(`  ✓ 导入 ${resourceCount} 个资源`);
      totalResources += resourceCount;
    }

    console.log('');
  }

  console.log('═'.repeat(40));
  console.log(`✅ 导入完成!`);
  console.log(`   📊 总计: ${totalResources} 个资源, ${totalFilters} 个过滤器`);
  console.log('═'.repeat(40));
}

// 运行导入
importData().catch(console.error);
