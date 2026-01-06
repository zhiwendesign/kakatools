/**
 * 为星芒学社添加20组测试数据
 * 使用方法: node add-kaka-data.js
 */

const { resources } = require('./db');

// 生成20组星芒学社数据
const kakaResources = [
  {
    id: 'kaka-1',
    title: 'AI 提示词工程实战',
    description: '深入学习 AI 提示词技巧，提升 AI 工具使用效率，掌握高级提示词编写方法。',
    category: '星芒学社',
    tags: ['Exclusive', 'AI', 'Prompt'],
    imageUrl: 'https://picsum.photos/id/50/600/400',
    link: '#',
    featured: true,
  },
  {
    id: 'kaka-2',
    title: '前端开发进阶训练营',
    description: '从零到一掌握现代前端开发技术栈，包括 React、Vue、Next.js 等框架实战。',
    category: '星芒学社',
    tags: ['Workshops', 'Frontend', 'React'],
    imageUrl: 'https://picsum.photos/id/51/600/400',
    link: '#',
    featured: true,
  },
  {
    id: 'kaka-3',
    title: 'UI/UX 设计思维工作坊',
    description: '学习用户体验设计方法论，掌握用户研究、原型设计和交互设计核心技能。',
    category: '星芒学社',
    tags: ['Workshops', 'UI/UX', 'Design'],
    imageUrl: 'https://picsum.photos/id/52/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-4',
    title: '产品经理一对一指导',
    description: '资深产品经理提供个性化指导，帮助提升产品思维和项目管理能力。',
    category: '星芒学社',
    tags: ['Mentorship', 'Product', 'Management'],
    imageUrl: 'https://picsum.photos/id/53/600/400',
    link: '#',
    featured: true,
  },
  {
    id: 'kaka-5',
    title: '全栈开发实战项目',
    description: '通过真实项目学习全栈开发，涵盖前端、后端、数据库和部署全流程。',
    category: '星芒学社',
    tags: ['Workshops', 'Fullstack', 'Project'],
    imageUrl: 'https://picsum.photos/id/54/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-6',
    title: '数据科学入门课程',
    description: '学习数据分析、机器学习和数据可视化，掌握数据科学核心技能。',
    category: '星芒学社',
    tags: ['Exclusive', 'Data', 'Science'],
    imageUrl: 'https://picsum.photos/id/55/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-7',
    title: '移动应用开发训练',
    description: '学习 React Native 和 Flutter，掌握跨平台移动应用开发技术。',
    category: '星芒学社',
    tags: ['Workshops', 'Mobile', 'React Native'],
    imageUrl: 'https://picsum.photos/id/56/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-8',
    title: '技术写作与文档规范',
    description: '提升技术文档写作能力，学习如何编写清晰、易懂的技术文档。',
    category: '星芒学社',
    tags: ['Exclusive', 'Writing', 'Documentation'],
    imageUrl: 'https://picsum.photos/id/57/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-9',
    title: 'DevOps 实践指南',
    description: '学习 CI/CD、容器化和云部署，掌握现代 DevOps 工作流程。',
    category: '星芒学社',
    tags: ['Workshops', 'DevOps', 'CI/CD'],
    imageUrl: 'https://picsum.photos/id/58/600/400',
    link: '#',
    featured: true,
  },
  {
    id: 'kaka-10',
    title: '算法与数据结构精讲',
    description: '系统学习算法和数据结构，提升编程能力和问题解决思维。',
    category: '星芒学社',
    tags: ['Exclusive', 'Algorithm', 'Coding'],
    imageUrl: 'https://picsum.photos/id/59/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-11',
    title: '创业项目孵化指导',
    description: '获得创业导师一对一指导，学习商业模式设计和产品迭代方法。',
    category: '星芒学社',
    tags: ['Mentorship', 'Startup', 'Business'],
    imageUrl: 'https://picsum.photos/id/60/600/400',
    link: '#',
    featured: true,
  },
  {
    id: 'kaka-12',
    title: 'Web3 与区块链开发',
    description: '探索 Web3 技术，学习智能合约开发和去中心化应用构建。',
    category: '星芒学社',
    tags: ['Workshops', 'Web3', 'Blockchain'],
    imageUrl: 'https://picsum.photos/id/61/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-13',
    title: 'Python 数据分析实战',
    description: '使用 Python 进行数据清洗、分析和可视化，掌握 pandas、numpy 等工具。',
    category: '星芒学社',
    tags: ['Exclusive', 'Python', 'Data'],
    imageUrl: 'https://picsum.photos/id/62/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-14',
    title: '设计系统构建方法',
    description: '学习如何设计和维护企业级设计系统，提升设计效率和一致性。',
    category: '星芒学社',
    tags: ['Workshops', 'Design System', 'UI/UX'],
    imageUrl: 'https://picsum.photos/id/63/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-15',
    title: '技术面试准备课程',
    description: '系统准备技术面试，学习算法题解法和系统设计思路。',
    category: '星芒学社',
    tags: ['Exclusive', 'Interview', 'Career'],
    imageUrl: 'https://picsum.photos/id/64/600/400',
    link: '#',
    featured: true,
  },
  {
    id: 'kaka-16',
    title: '微服务架构设计',
    description: '学习微服务架构设计原则，掌握服务拆分、通信和治理方法。',
    category: '星芒学社',
    tags: ['Workshops', 'Architecture', 'Microservices'],
    imageUrl: 'https://picsum.photos/id/65/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-17',
    title: '用户体验研究实战',
    description: '学习用户研究方法，包括用户访谈、问卷调查和数据分析技巧。',
    category: '星芒学社',
    tags: ['Mentorship', 'UX Research', 'User Study'],
    imageUrl: 'https://picsum.photos/id/66/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-18',
    title: 'TypeScript 高级特性',
    description: '深入学习 TypeScript 高级类型系统和工程化实践。',
    category: '星芒学社',
    tags: ['Exclusive', 'TypeScript', 'Coding'],
    imageUrl: 'https://picsum.photos/id/67/600/400',
    link: '#',
    featured: false,
  },
  {
    id: 'kaka-19',
    title: '性能优化最佳实践',
    description: '学习前端和后端性能优化技巧，提升应用响应速度和用户体验。',
    category: '星芒学社',
    tags: ['Workshops', 'Performance', 'Optimization'],
    imageUrl: 'https://picsum.photos/id/68/600/400',
    link: '#',
    featured: true,
  },
  {
    id: 'kaka-20',
    title: '开源项目贡献指南',
    description: '学习如何参与开源项目，包括代码贡献、文档编写和社区协作。',
    category: '星芒学社',
    tags: ['Exclusive', 'Open Source', 'Community'],
    imageUrl: 'https://picsum.photos/id/69/600/400',
    link: '#',
    featured: false,
  },
];

// 添加数据
async function addKakaData() {
  console.log('🚀 开始为星芒学社添加20组数据...\n');

  try {
    // 为每个资源添加 sortOrder
    const resourcesWithOrder = kakaResources.map((r, index) => ({
      ...r,
      sortOrder: index,
    }));

    // 批量插入数据
    const count = resources.upsertMany(resourcesWithOrder);
    
    console.log('═'.repeat(40));
    console.log(`✅ 添加完成!`);
    console.log(`   📊 成功添加 ${count} 个星芒学社资源`);
    console.log('═'.repeat(40));
  } catch (error) {
    console.error('❌ 添加失败:', error);
    process.exit(1);
  }
}

// 运行添加
addKakaData().catch(console.error);

