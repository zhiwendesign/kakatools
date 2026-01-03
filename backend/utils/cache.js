/**
 * 简单的内存缓存系统
 * 用于缓存频繁访问的数据，减少数据库查询
 */

class SimpleCache {
  constructor(ttl = 60000) { // 默认1分钟
    this.cache = new Map();
    this.ttl = ttl;
    this.cleanupInterval = null;
    
    // 定期清理过期缓存
    this.startCleanup();
  }
  
  startCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分钟清理一次
  }
  
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }
  
  delete(key) {
    return this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  // 获取缓存统计
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }
  
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = SimpleCache;

