/**
 * 批量生成测试数据脚本
 * 为每个分类（AIGC、UXTips、星芒学社、图库）生成30条数据
 * 
 * 使用方法: node generate-bulk-data.js
 */

const { resources } = require('./db');

// 生成随机ID
function generateId(category, index) {
  // 将分类名转换为有效的ID前缀
  const prefixMap = {
    'AIGC': 'aicc',
    'UXTips': 'uxtips',
    'Learning': 'learning',
    '星芒学社': 'star',
    '图库': 'gallery'
  };
  const prefix = prefixMap[category] || category.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${prefix}-${index + 1}`;
}

// 生成随机图片URL
function getRandomImageUrl(index) {
  const imageIds = [100, 20, 16, 1, 30, 31, 32, 40, 41, 50, 60, 70, 80, 90, 101, 102, 103, 104, 105];
  const id = imageIds[index % imageIds.length];
  return `https://picsum.photos/id/${id}/600/400`;
}

// AIGC 分类数据模板
const aiTemplates = [
  { title: 'ChatGPT', tags: ['LLM', 'Chat', 'OpenAI'], desc: 'OpenAI开发的强大对话AI助手，在文本生成和理解方面表现出色。' },
  { title: 'Claude', tags: ['LLM', 'Coding', 'Reasoning'], desc: 'Anthropic最新模型，在编程和推理任务中表现出色。' },
  { title: 'Midjourney', tags: ['Image Gen', 'Art', 'Discord'], desc: '基于文本提示生成高质量艺术风格图像。' },
  { title: 'Gemini', tags: ['LLM', 'Multimodal', 'Google'], desc: '谷歌最先进的AI模型，支持多模态功能。' },
  { title: 'Stable Diffusion', tags: ['Image Gen', 'Open Source'], desc: '开源的图像生成模型，支持本地部署。' },
  { title: 'DALL-E', tags: ['Image Gen', 'OpenAI'], desc: 'OpenAI的图像生成模型，支持创意图像生成。' },
  { title: 'Runway', tags: ['Video', 'Creative'], desc: 'AI视频生成和编辑工具，支持多种创意功能。' },
  { title: 'Sora', tags: ['Video', 'OpenAI'], desc: 'OpenAI的视频生成模型，可以生成高质量视频。' },
  { title: 'Perplexity', tags: ['Search', 'LLM'], desc: 'AI驱动的搜索引擎，提供准确的答案和引用。' },
  { title: 'Notion AI', tags: ['Productivity', 'LLM'], desc: 'Notion集成的AI助手，帮助提升工作效率。' },
];

// UXTips 分类数据模板
const uxTemplates = [
  { title: 'Figma', tags: ['UI/UX', 'Design', 'Collaboration'], desc: '协作式界面设计工具，支持实时多人编辑。' },
  { title: 'Framer', tags: ['UI/UX', 'No-Code', 'Prototype'], desc: '强大的原型设计和网站构建工具。' },
  { title: 'Spline', tags: ['3D', 'Interactive', 'Web'], desc: '3D 设计工具，创建交互式 3D 网页体验。' },
  { title: 'Sketch', tags: ['UI/UX', 'Design', 'Mac'], desc: '专业的UI设计工具，Mac平台首选。' },
  { title: 'Adobe XD', tags: ['UI/UX', 'Design', 'Adobe'], desc: 'Adobe的UX设计工具，支持原型和协作。' },
  { title: 'Principle', tags: ['Animation', 'Prototype'], desc: '交互式动画原型设计工具。' },
  { title: 'Webflow', tags: ['No-Code', 'Web', 'CMS'], desc: '可视化网站构建平台，无需编码。' },
  { title: 'Bubble', tags: ['No-Code', 'Web', 'App'], desc: '无代码应用构建平台，功能强大。' },
  { title: 'Dribbble', tags: ['Inspiration', 'Design'], desc: '设计师作品展示和灵感来源平台。' },
  { title: 'Behance', tags: ['Inspiration', 'Portfolio'], desc: 'Adobe的创意作品展示平台。' },
];

// 星芒学社 分类数据模板
const starTemplates = [
  { title: 'AI 提示词工程实战', tags: ['Exclusive', 'AI', 'Prompt'], desc: '深入学习 AI 提示词技巧，提升 AI 工具使用效率。' },
  { title: 'ComfyUI 工作流设计', tags: ['Exclusive', 'AI', 'Workflow'], desc: '掌握 ComfyUI 高级工作流设计技巧。' },
  { title: 'Stable Diffusion 进阶', tags: ['Exclusive', 'AI', 'Image Gen'], desc: '深入学习 Stable Diffusion 的高级应用。' },
  { title: 'AI 视频生成技术', tags: ['Exclusive', 'AI', 'Video'], desc: '探索 AI 视频生成的最新技术和应用。' },
  { title: 'AI 辅助设计工作流', tags: ['Workshops', 'Design', 'AI'], desc: '将 AI 工具融入设计工作流程。' },
  { title: '提示词优化技巧', tags: ['Workshops', 'AI', 'Prompt'], desc: '学习如何编写高效的 AI 提示词。' },
  { title: 'AI 工具组合使用', tags: ['Workshops', 'AI', 'Tools'], desc: '掌握多个 AI 工具的组合使用技巧。' },
  { title: '创意项目实战', tags: ['Mentorship', 'Creative', 'Project'], desc: '一对一指导完成创意项目。' },
  { title: '作品集优化指导', tags: ['Mentorship', 'Portfolio'], desc: '专业指导优化个人作品集。' },
  { title: '职业发展咨询', tags: ['Mentorship', 'Career'], desc: '获得职业发展方面的专业建议。' },
];

// 图库 分类数据模板
const galleryTemplates = [
  { title: '抽象艺术系列', tags: ['Art', 'Abstract'], desc: '精选抽象艺术作品，展现视觉艺术之美。' },
  { title: '自然风光摄影', tags: ['Photography', 'Nature'], desc: '优美的自然风光摄影作品集合。' },
  { title: '城市建筑美学', tags: ['Architecture', 'Urban'], desc: '现代城市建筑美学摄影作品。' },
  { title: '人物肖像精选', tags: ['Portrait', 'People'], desc: '高质量人物肖像摄影作品。' },
  { title: '静物摄影艺术', tags: ['Still Life', 'Photography'], desc: '精美的静物摄影艺术作品。' },
  { title: '概念设计图集', tags: ['Concept', 'Design'], desc: '创意概念设计图集，激发灵感。' },
  { title: '插画作品精选', tags: ['Illustration', 'Art'], desc: '优秀的插画作品集合。' },
  { title: '数字艺术创作', tags: ['Digital Art', 'Creative'], desc: '现代数字艺术创作作品。' },
  { title: '色彩搭配参考', tags: ['Color', 'Reference'], desc: '专业的色彩搭配参考图集。' },
  { title: '视觉设计灵感', tags: ['Inspiration', 'Visual'], desc: '视觉设计灵感来源图集。' },
];

// 生成数据
function generateResources(category, templates, count = 30) {
  const resources = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const index = Math.floor(i / templates.length);
    const suffix = index > 0 ? ` ${index + 1}` : '';
    
    resources.push({
      id: generateId(category, i),
      title: `${template.title}${suffix}`,
      description: template.desc,
      category: category,
      tags: template.tags,
      imageUrl: getRandomImageUrl(i),
      link: i % 3 === 0 ? 'https://example.com' : '#',
      featured: i < 5, // 前5个设为推荐
      contentType: 'link',
      content: '',
      sortOrder: i,
      createdAt: now - (count - i) * 1000,
      updatedAt: now - (count - i) * 1000,
    });
  }
  
  return resources;
}

// 主函数
async function generateBulkData() {
  console.log('🚀 开始生成批量数据...\n');

  const allResources = [
    ...generateResources('AIGC', aiTemplates, 30),
    ...generateResources('UXTips', uxTemplates, 30),
    ...generateResources('星芒学社', starTemplates, 30),
    ...generateResources('图库', galleryTemplates, 30),
  ];

  console.log(`📊 准备导入 ${allResources.length} 条资源`);
  console.log(`   - AIGC: 30 条`);
  console.log(`   - UXTips: 30 条`);
  console.log(`   - 星芒学社: 30 条`);
  console.log(`   - 图库: 30 条\n`);

  let successCount = 0;
  let failCount = 0;

  // 批量导入
  for (const resource of allResources) {
    try {
      const success = resources.upsert(resource);
      if (success) {
        successCount++;
      } else {
        failCount++;
        console.warn(`⚠️  导入失败: ${resource.title}`);
      }
    } catch (error) {
      failCount++;
      console.error(`❌ 导入错误: ${resource.title}`, error.message);
    }
  }

  console.log('\n' + '═'.repeat(40));
  console.log(`✅ 导入完成!`);
  console.log(`   📊 成功: ${successCount} 条`);
  console.log(`   ❌ 失败: ${failCount} 条`);
  console.log('═'.repeat(40));
}

// 运行
generateBulkData().catch(console.error);

