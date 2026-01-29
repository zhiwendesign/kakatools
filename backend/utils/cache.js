/**
 * 高级内存缓存系统（支持LRU和TTL）
 * 用于缓存频繁访问的数据，减少数据库查询
 */

class AdvancedCache {
  constructor(options = {}) {
    // 默认配置
    this.options = {
      ttl: 60000, // 默认1分钟
      maxSize: 1000, // 默认最大缓存1000个项目
      cleanupInterval: 60000, // 每分钟清理一次过期项目
      ...options
    };
    
    this.cache = new Map(); // 用于快速查找
    this.keys = []; // 用于维护访问顺序（LRU）
    this.cleanupInterval = null;
    
    // 定期清理过期缓存
    this.startCleanup();
  }
  
  /**
   * 启动定期清理过期缓存的定时器
   */
  startCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.options.cleanupInterval);
  }
  
  /**
   * 清理过期的缓存项
   * @returns {number} 清理的过期项数量
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    // 清理所有过期项
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        this.keys = this.keys.filter(k => k !== key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  /**
   * 更新键的访问时间（用于LRU）
   * @param {string} key - 缓存键
   */
  updateAccessTime(key) {
    // 移除旧位置
    this.keys = this.keys.filter(k => k !== key);
    // 添加到末尾（最近访问）
    this.keys.push(key);
  }
  
  /**
   * 清理超出最大大小的缓存项（LRU策略）
   */
  cleanupLRU() {
    while (this.cache.size > this.options.maxSize) {
      // 移除最久未访问的键（数组开头）
      const oldestKey = this.keys.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }
  
  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {*} 缓存值或null
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.keys = this.keys.filter(k => k !== key);
      return null;
    }
    
    // 更新访问时间（LRU）
    this.updateAccessTime(key);
    
    return item.value;
  }
  
  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number|null} customTtl - 自定义过期时间（毫秒）
   */
  set(key, value, customTtl = null) {
    const ttl = customTtl || this.options.ttl;
    
    // 如果键已存在，先移除旧的
    if (this.cache.has(key)) {
      this.keys = this.keys.filter(k => k !== key);
    }
    
    // 设置新的缓存值
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    });
    
    // 更新访问时间
    this.keys.push(key);
    
    // 清理超出最大大小的项（LRU）
    this.cleanupLRU();
  }
  
  /**
   * 删除缓存值
   * @param {string} key - 缓存键
   * @returns {boolean} 是否删除成功
   */
  delete(key) {
    if (this.cache.has(key)) {
      this.keys = this.keys.filter(k => k !== key);
      return this.cache.delete(key);
    }
    return false;
  }
  
  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
    this.keys = [];
  }
  
  /**
   * 获取缓存统计信息
   * @returns {object} 缓存统计
   */
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
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
      oldestKey: this.keys[0] || null,
      newestKey: this.keys[this.keys.length - 1] || null
    };
  }
  
  /**
   * 获取缓存项的元数据
   * @param {string} key - 缓存键
   * @returns {object|null} 缓存项元数据
   */
  getMetadata(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    return {
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
      lastAccessedAt: item.lastAccessedAt,
      timeToLive: item.expiresAt - Date.now()
    };
  }
  
  /**
   * 停止定期清理
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = AdvancedCache;

