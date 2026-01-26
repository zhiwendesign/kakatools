/**
 * 统一的日志系统
 * 支持不同级别的日志，生产环境可以配置日志级别
 */

const IS_DEV = process.env.NODE_ENV !== 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_DEV ? 'debug' : 'info');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const shouldLog = (level) => {
  return LOG_LEVELS[level] <= LOG_LEVELS[LOG_LEVEL];
};

const formatMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    return `${prefix} ${message} ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
  }
  return `${prefix} ${message}`;
};

const logger = {
  error(message, data = null) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, data));
    }
  },
  
  warn(message, data = null) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, data));
    }
  },
  
  info(message, data = null) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, data));
    }
  },
  
  debug(message, data = null) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, data));
    }
  },
  
  // 特殊格式的日志
  request(req, res, duration) {
    const level = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'info';
    const message = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
    const data = {
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent')?.substring(0, 50),
    };
    
    if (duration > 1000) {
      this.warn(`[SLOW REQUEST] ${message}`, data);
    } else if (level === 'error') {
      this.error(message, data);
    } else if (IS_DEV) {
      this.debug(message, data);
    }
  },
  
  // 数据库操作日志
  db(operation, success, error = null) {
    if (success) {
      this.debug(`DB ${operation}`, { success: true });
    } else {
      this.error(`DB ${operation} failed`, error);
    }
  },
};

module.exports = logger;

