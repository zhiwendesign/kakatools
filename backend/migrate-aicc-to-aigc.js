/**
 * 数据库迁移脚本：将 AiCC 分类更新为 AIGC
 * 
 * 使用方法：
 * node migrate-aicc-to-aigc.js
 */

const { db } = require('./db');
const logger = require('./utils/logger');

function migrateAiCCToAIGC() {
  try {
    logger.info('开始迁移：AiCC -> AIGC');
    
    // 更新 resources 表中的分类名称
    const updateResources = db.prepare(`
      UPDATE resources 
      SET category = 'AIGC' 
      WHERE category = 'AiCC'
    `);
    
    const resourcesResult = updateResources.run();
    logger.info(`更新 resources 表: ${resourcesResult.changes} 条记录`);
    
    // 更新 filters 表中的分类名称
    const updateFilters = db.prepare(`
      UPDATE filters 
      SET category = 'AIGC' 
      WHERE category = 'AiCC'
    `);
    
    const filtersResult = updateFilters.run();
    logger.info(`更新 filters 表: ${filtersResult.changes} 条记录`);
    
    // 验证迁移结果
    const checkResources = db.prepare(`SELECT COUNT(*) as count FROM resources WHERE category = 'AIGC'`).get();
    const checkFilters = db.prepare(`SELECT COUNT(*) as count FROM filters WHERE category = 'AIGC'`).get();
    
    logger.info(`迁移完成！`);
    logger.info(`- AIGC 分类资源数量: ${checkResources.count}`);
    logger.info(`- AIGC 分类过滤器数量: ${checkFilters.count}`);
    
    // 检查是否还有遗留的 AiCC 数据
    const remainingResources = db.prepare(`SELECT COUNT(*) as count FROM resources WHERE category = 'AiCC'`).get();
    const remainingFilters = db.prepare(`SELECT COUNT(*) as count FROM filters WHERE category = 'AiCC'`).get();
    
    if (remainingResources.count > 0 || remainingFilters.count > 0) {
      logger.warn(`警告：仍有遗留数据未迁移`);
      logger.warn(`- 遗留 resources: ${remainingResources.count}`);
      logger.warn(`- 遗留 filters: ${remainingFilters.count}`);
    } else {
      logger.info('所有数据已成功迁移，无遗留数据');
    }
    
    return {
      success: true,
      resourcesUpdated: resourcesResult.changes,
      filtersUpdated: filtersResult.changes,
      aigcResources: checkResources.count,
      aigcFilters: checkFilters.count,
    };
  } catch (error) {
    logger.error('迁移失败', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  try {
    const result = migrateAiCCToAIGC();
    console.log('\n✅ 迁移成功！');
    console.log(`- 更新资源: ${result.resourcesUpdated} 条`);
    console.log(`- 更新过滤器: ${result.filtersUpdated} 条`);
    console.log(`- AIGC 资源总数: ${result.aigcResources}`);
    console.log(`- AIGC 过滤器总数: ${result.aigcFilters}`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

module.exports = { migrateAiCCToAIGC };
