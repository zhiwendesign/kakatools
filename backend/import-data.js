/**
 * 数据导入脚本
 * 将 JSON 文件中的数据导入到 SQLite 数据库
 * 
 * 使用方法: node import-data.js
 */

const fs = require('fs');
const path = require('path');
const { resources, filters, db } = require('./db');

// JSON 数据文件映射
const DATA_FILES = {
  AiCC: 'ai.json',
  UXLib: 'design.json',
  Learning: 'learning.json',
  'Starlight Academy': 'starlight.json',
};

// 数据目录
const DATA_DIR = path.join(__dirname, 'data');

// 导入单个分类的数据
function importCategory(category, filename) {
  const filePath = path.join(DATA_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${filename}`);
    return { resources: 0, filters: 0 };
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    let resourceCount = 0;
    let filterCount = 0;

    // 导入过滤器
    if (data.filters && Array.isArray(data.filters)) {
      filterCount = filters.upsertMany(data.filters, category);
      console.log(`  ✓ 导入 ${filterCount} 个过滤器`);
    }

    // 导入资源
    if (data.resources && Array.isArray(data.resources)) {
      // 确保每个资源都有正确的 category
      const resourcesWithCategory = data.resources.map((r, index) => ({
        ...r,
        category: r.category || category,
        sortOrder: index,
      }));
      resourceCount = resources.upsertMany(resourcesWithCategory);
      console.log(`  ✓ 导入 ${resourceCount} 个资源`);
    }

    return { resources: resourceCount, filters: filterCount };
  } catch (error) {
    console.error(`❌ 导入 ${category} 失败:`, error.message);
    return { resources: 0, filters: 0 };
  }
}

// 主导入函数
function importAllData() {
  console.log('🚀 开始导入数据到 SQLite 数据库...\n');

  let totalResources = 0;
  let totalFilters = 0;

  for (const [category, filename] of Object.entries(DATA_FILES)) {
    console.log(`📁 导入分类: ${category} (${filename})`);
    const result = importCategory(category, filename);
    totalResources += result.resources;
    totalFilters += result.filters;
    console.log('');
  }

  console.log('═'.repeat(40));
  console.log(`✅ 导入完成!`);
  console.log(`   📊 总计: ${totalResources} 个资源, ${totalFilters} 个过滤器`);
  console.log('═'.repeat(40));

  // 显示数据库统计
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM resources) as resources,
      (SELECT COUNT(*) FROM filters) as filters,
      (SELECT COUNT(*) FROM tokens) as tokens,
      (SELECT COUNT(*) FROM access_keys) as access_keys
  `).get();

  console.log('\n📈 数据库统计:');
  console.log(`   - 资源: ${stats.resources}`);
  console.log(`   - 过滤器: ${stats.filters}`);
  console.log(`   - Token: ${stats.tokens}`);
  console.log(`   - 访问密钥: ${stats.access_keys}`);
}

// 运行导入
importAllData();

