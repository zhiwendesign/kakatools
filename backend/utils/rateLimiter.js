/**
 * 优化的限流器
 * 使用滑动窗口算法，自动清理过期记录
 */

class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
    this.cleanupInterval = null;
    
    // 定期清理过期记录（每5分钟）
    this.startCleanup();
  }
  
  startCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }
  
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, data] of this.requests.entries()) {
      // 如果窗口已过期，删除记录
      if (now - data.windowStart > this.windowMs) {
        this.requests.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      // 只在清理了大量记录时记录日志
      if (cleaned > 100) {
        const logger = require('./logger');
        logger.debug(`Rate limiter cleaned ${cleaned} expired entries`);
      }
    }
  }
  
  check(identifier) {
    const now = Date.now();
    const record = this.requests.get(identifier);
    
    // 如果没有记录或窗口已过期，创建新记录
    if (!record || now - record.windowStart > this.windowMs) {
      this.requests.set(identifier, {
        count: 1,
        windowStart: now,
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }
    
    // 如果超过限制
    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.windowStart + this.windowMs,
      };
    }
    
    // 增加计数
    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
    };
  }
  
  // 获取当前状态（用于监控）
  getStats() {
    const now = Date.now();
    let active = 0;
    let totalRequests = 0;
    
    for (const [key, data] of this.requests.entries()) {
      if (now - data.windowStart <= this.windowMs) {
        active++;
        totalRequests += data.count;
      }
    }
    
    return {
      activeClients: active,
      totalRequests,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    };
  }
  
  // 清理所有记录
  reset() {
    this.requests.clear();
  }
  
  // 停止清理定时器
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = RateLimiter;

