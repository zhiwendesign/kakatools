const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

const IS_DEV = process.env.NODE_ENV !== 'production';

// Database file path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'kktools.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database with error handling
let db = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

/**
 * 安全关闭数据库连接
 */
const safeCloseDatabase = () => {
  if (db) {
    try {
      db.close();
      logger.info('Database connection closed safely');
    } catch (e) {
      // Ignore close errors
      logger.warn('Failed to close database connection', e);
    } finally {
      db = null;
    }
  }
};

/**
 * 初始化数据库连接（带重试机制）
 * @param {number} attempt - 当前重试次数
 * @returns {Database} 数据库连接实例
 */
const initDatabase = (attempt = 0) => {
  try {
    // 关闭现有连接
    safeCloseDatabase();

    db = new Database(DB_PATH, {
      // 设置超时时间（毫秒）
      timeout: 5000,
      // 在数据库锁定时抛出错误而不是无限等待
      verbose: IS_DEV ? console.log : undefined,
    });

    // 启用WAL模式以提高性能
    db.pragma('journal_mode = WAL');

    // 设置繁忙超时
    db.pragma('busy_timeout = 5000');

    // 启用外键约束检查
    db.pragma('foreign_keys = ON');

    // 启用自动 vacuum
    db.pragma('auto_vacuum = incremental');

    // 设置缓存大小
    db.pragma('cache_size = -1000000'); // 1GB 缓存

    // 初始化表结构
    initTables();

    // 重置连接尝试次数
    connectionAttempts = 0;
    
    logger.info('Database connection established');
    return db;
  } catch (error) {
    logger.error(`Database initialization failed (attempt ${attempt + 1}/${MAX_CONNECTION_ATTEMPTS})`, {
      path: DB_PATH,
      code: error.code,
      message: error.message,
    });
    
    // 重试逻辑
    if (attempt < MAX_CONNECTION_ATTEMPTS - 1) {
      connectionAttempts++;
      const delay = Math.pow(2, attempt) * 1000; // 指数退避
      logger.info(`Retrying database connection in ${delay}ms...`);
      
      // 递归重试
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const newDb = initDatabase(attempt + 1);
            resolve(newDb);
          } catch (e) {
            reject(e);
          }
        }, delay);
      });
    }
    
    // 达到最大重试次数，抛出错误
    throw error;
  }
};

/**
 * 获取数据库连接（带自动恢复机制）
 * @returns {Database} 数据库连接实例
 */
const getDbConnection = () => {
  if (!db) {
    logger.warn('Database connection is null, attempting to reconnect...');
    db = initDatabase();
  }
  return db;
};

/**
 * 数据库操作包装器（带重试机制）
 * @param {Function} operation - 数据库操作函数
 * @param {number} maxRetries - 最大重试次数
 * @returns {*} 操作结果
 */
const withRetry = (operation, maxRetries = 3) => {
  let retries = 0;
  
  const execute = () => {
    try {
      return operation();
    } catch (error) {
      if (retries < maxRetries && (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED')) {
        retries++;
        const delay = Math.pow(2, retries) * 100; // 指数退避
        logger.warn(`Database operation failed (${error.code}), retrying in ${delay}ms... (attempt ${retries}/${maxRetries})`);
        
        // 同步重试
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            try {
              resolve(execute());
            } catch (e) {
              reject(e);
            }
          }, delay);
        });
      }
      throw error;
    }
  };
  
  return execute();
};

// 初始化表结构
const initTables = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'admin',
      ip_address TEXT,
      access_key_code TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER
    )
  `);

  // 添加新列（如果不存在）
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN ip_address TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN access_key_code TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Access keys table
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      username TEXT DEFAULT 'Anonymous',
      name TEXT,
      user_type TEXT DEFAULT 'user',
      duration INTEGER NOT NULL,
      percentage INTEGER DEFAULT 100,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  // 添加新列（如果不存在）- 兼容旧版本
  try {
    db.exec(`ALTER TABLE access_keys ADD COLUMN user_type TEXT DEFAULT 'user'`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE access_keys ADD COLUMN percentage INTEGER DEFAULT 100`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Resources table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      image_url TEXT,
      link TEXT,
      featured INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Add new columns if they don't exist (migration)
  try {
    db.exec(`ALTER TABLE resources ADD COLUMN content_type TEXT DEFAULT 'link'`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE resources ADD COLUMN content TEXT DEFAULT ''`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE resources ADD COLUMN menu TEXT DEFAULT ''`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Tag Dictionary table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tag_dictionary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      tag TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      UNIQUE(category, tag)
    )
  `);

  // Filters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      tag TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      UNIQUE(category, tag)
    )
  `);

  // Admin settings table (for storing password hash)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);
    CREATE INDEX IF NOT EXISTS idx_tokens_expires ON tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_tokens_access_key ON tokens(access_key_code);
    CREATE INDEX IF NOT EXISTS idx_tokens_ip ON tokens(ip_address);
    CREATE INDEX IF NOT EXISTS idx_access_keys_code ON access_keys(code);
    CREATE INDEX IF NOT EXISTS idx_access_keys_expires ON access_keys(expires_at);
    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
    CREATE INDEX IF NOT EXISTS idx_filters_category ON filters(category);
    CREATE INDEX IF NOT EXISTS idx_tag_dict_category ON tag_dictionary(category);
  `);
};

// 初始化数据库
try {
  db = initDatabase();
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database on startup', error);
  // 在生产环境中，可能需要退出进程
  // 但在开发环境中，可以继续运行（某些操作会失败）
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// ==================== Token Operations ====================

const tokens = {
  add(token, type = 'admin', expiresAt = null, ipAddress = null, accessKeyCode = null) {
    try {
      const db = getDb();
      return db.prepare(`
        INSERT INTO tokens (token, type, ip_address, access_key_code, created_at, expires_at) 
        VALUES (@token, @type, @ipAddress, @accessKeyCode, @createdAt, @expiresAt)
      `).run({
        token,
        type,
        ipAddress,
        accessKeyCode,
        createdAt: Date.now(),
        expiresAt
      });
    } catch (error) {
      logger.error('Error adding token', error);
      return false;
    }
  },
  verify(token) {
    const db = getDb();
    return !!db.prepare(`
      SELECT * FROM tokens 
      WHERE token = ? AND (expires_at IS NULL OR expires_at > ?)
    `).get(token, Date.now());
  },
  // 获取 token 类型（admin 或 starlight）
  getType(token) {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM tokens 
      WHERE token = ? AND (expires_at IS NULL OR expires_at > ?)
    `).get(token, Date.now());
    return row ? row.type : null;
  },
  // 验证是否是管理员 token
  isAdmin(token) {
    return this.getType(token) === 'admin';
  },
  // 检查 token 是否有管理员权限（admin token 或 admin-type key）
  // 注意：此函数需要在 accessKeys 定义之后调用，在 server.js 中实现完整逻辑
  hasAdminAccess(token) {
    const tokenType = this.getType(token);
    if (tokenType === 'admin') {
      return true;
    }
    // starlight token 的 admin 权限检查在 server.js 中通过 accessKeys 完成
    return false;
  },
  // 检查访问密钥是否已被其他 IP 使用
  isAccessKeyInUse(accessKeyCode, currentIp) {
    const db = getDb();
    const existingTokens = db.prepare(`SELECT * FROM tokens WHERE access_key_code = ? AND type = 'starlight' AND (expires_at IS NULL OR expires_at > ?)`)
      .all(accessKeyCode, Date.now());
    if (existingTokens.length === 0) {
      return false;
    }
    // 检查是否有其他 IP 在使用
    const otherIpTokens = existingTokens.filter(t => t.ip_address !== currentIp);
    return otherIpTokens.length > 0;
  },
  // 删除指定访问密钥的所有 token（用于强制下线）
  deleteByAccessKey(accessKeyCode) {
    const db = getDb();
    return db.prepare(`DELETE FROM tokens WHERE access_key_code = ? AND type = 'starlight'`)
      .run(accessKeyCode).changes;
  },
  delete(token) {
    const db = getDb();
    return db.prepare(`DELETE FROM tokens WHERE token = ?`)
      .run(token).changes > 0;
  },
  cleanup() {
    const db = getDb();
    const result = db.prepare(`DELETE FROM tokens WHERE expires_at IS NOT NULL AND expires_at < ?`)
      .run(Date.now());
    if (result.changes > 0) logger.debug(`Cleaned up ${result.changes} expired tokens`);
    return result.changes;
  },
};

// 提供给 server.js 使用的复合查询操作
const tokenOps = {
  verify: {
    get(token, now = Date.now()) {
      const db = getDb();
      return db.prepare(`
        SELECT * FROM tokens 
        WHERE token = ? AND (expires_at IS NULL OR expires_at > ?)
      `).get(token, now);
    }
  },
  findByAccessKey: {
    all(accessKeyCode, now = Date.now()) {
      const db = getDb();
      return db.prepare(`
        SELECT * FROM tokens 
        WHERE access_key_code = ? 
          AND type = 'starlight' 
          AND (expires_at IS NULL OR expires_at > ?)
      `).all(accessKeyCode, now);
    }
  }
};

// ==================== Access Key Operations ====================

const accessKeys = {
  add(code, username, durationInDays, userType = 'user', percentage = 100) {
    const now = Date.now();
    const expiresAt = now + durationInDays * 24 * 60 * 60 * 1000;
    // 确保 percentage 在 0-100 范围内
    // 修复：使用 nullish coalescing 而不是 ||，避免 0 被当作 falsy
    const validPercentage = percentage !== null && percentage !== undefined
      ? Math.max(0, Math.min(100, percentage))
      : 100;
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO access_keys (code, username, user_type, duration, percentage, created_at, expires_at)
        VALUES (@code, @username, @userType, @duration, @percentage, @createdAt, @expiresAt)
      `).run({ code, username, userType, duration: durationInDays, percentage: validPercentage, createdAt: now, expiresAt });
      return { code, username, userType, duration: durationInDays, percentage: validPercentage, createdAt: now, expiresAt };
    } catch (error) {
      logger.error('Error adding access key', error);
      return null;
    }
  },
  findByCode(code) {
    const db = getDb();
    return db.prepare(`SELECT * FROM access_keys WHERE code = ?`)
      .get(code.trim().toUpperCase());
  },
  getAll() {
    const db = getDb();
    db.prepare(`DELETE FROM access_keys WHERE expires_at < ?`).run(Date.now());
    return db.prepare(`SELECT * FROM access_keys WHERE expires_at > ?`)
      .all(Date.now()).map((row) => ({
        code: row.code,
        username: row.username,
        name: row.name,
        userType: row.user_type || 'user',
        percentage: row.percentage !== null && row.percentage !== undefined ? row.percentage : 100,
        duration: row.duration,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }));
  },
  delete(code) {
    const db = getDb();
    return db.prepare(`DELETE FROM access_keys WHERE code = ?`)
      .run(code).changes > 0;
  },
  updateName(code, name) {
    const db = getDb();
    const result = db.prepare(`UPDATE access_keys SET name = ? WHERE code = ?`)
      .run(name, code);
    return result.changes > 0 ? this.findByCode(code) : null;
  },
  isExpired(key) {
    return Date.now() > key.expires_at;
  },
  cleanup() {
    const db = getDb();
    const result = db.prepare(`DELETE FROM access_keys WHERE expires_at < ?`)
      .run(Date.now());
    if (result.changes > 0) logger.debug(`Cleaned up ${result.changes} expired access keys`);
    return result.changes;
  },
};

// ==================== Resource Operations ====================

const resources = {
  upsert(resource) {
    const now = Date.now();
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO resources (id, title, description, category, tags, image_url, link, featured, content_type, content, menu, sort_order, created_at, updated_at)
        VALUES (@id, @title, @description, @category, @tags, @imageUrl, @link, @featured, @contentType, @content, @menu, @sortOrder, @createdAt, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          title = @title,
          description = @description,
          category = @category,
          tags = @tags,
          image_url = @imageUrl,
          link = @link,
          featured = @featured,
          content_type = @contentType,
          content = @content,
          menu = @menu,
          sort_order = @sortOrder,
          updated_at = @updatedAt
      `).run({
        id: resource.id,
        title: resource.title,
        description: resource.description || '',
        category: resource.category,
        tags: JSON.stringify(resource.tags || []),
        imageUrl: resource.imageUrl || resource.image_url || '',
        link: resource.link || '',
        featured: resource.featured ? 1 : 0,
        contentType: resource.contentType || resource.content_type || 'link',
        content: resource.content || '',
        menu: resource.menu || '',
        sortOrder: resource.sortOrder || resource.sort_order || 0,
        createdAt: resource.createdAt || now,
        updatedAt: now,
      });
      return true;
    } catch (error) {
      logger.error('Error upserting resource', error);
      // 如果是唯一约束冲突，提供更详细的错误信息
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || (error.message && error.message.includes('UNIQUE constraint'))) {
        logger.warn(`资源ID冲突: ${resource.id}`);
      }
      return false;
    }
  },

  upsertMany(items) {
    const db = getDb();
    return db.transaction((items) => {
      for (const item of items) {
        resources.upsert(item);
      }
      return items.length;
    })(items);
  },

  getByCategory(category) {
    const db = getDb();
    return db.prepare(`SELECT * FROM resources WHERE category = ? ORDER BY sort_order, title`)
      .all(category).map(this._mapRow);
  },

  getAll() {
    const db = getDb();
    return db.prepare(`SELECT * FROM resources ORDER BY category, sort_order, title`)
      .all().map(this._mapRow);
  },

  getById(id) {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM resources WHERE id = ?`).get(id);
    return row ? this._mapRow(row) : null;
  },

  delete(id) {
    const db = getDb();
    return db.prepare(`DELETE FROM resources WHERE id = ?`)
      .run(id).changes > 0;
  },

  deleteByCategory(category) {
    const db = getDb();
    return db.prepare(`DELETE FROM resources WHERE category = ?`)
      .run(category).changes;
  },

  _mapRow(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      tags: JSON.parse(row.tags || '[]'),
      imageUrl: row.image_url,
      link: row.link,
      featured: row.featured === 1,
      contentType: row.content_type || 'link',
      content: row.content || '',
      menu: row.menu || '',
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

// ==================== Filter Operations ====================

const filters = {
  upsert(category, label, tag, sortOrder = 0) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO filters (category, label, tag, sort_order)
        VALUES (@category, @label, @tag, @sortOrder)
        ON CONFLICT(category, tag) DO UPDATE SET
          label = @label,
          sort_order = @sortOrder
      `).run({ category, label, tag, sortOrder });
      return true;
    } catch (error) {
      logger.error('Error upserting filter', error);
      return false;
    }
  },

  upsertMany(items, category) {
    const db = getDb();
    return db.transaction((items, category) => {
      for (let i = 0; i < items.length; i++) {
        filters.upsert(category, items[i].label, items[i].tag, i);
      }
      return items.length;
    })(items, category);
  },

  getByCategory(category) {
    const db = getDb();
    return db.prepare(`SELECT * FROM filters WHERE category = ? ORDER BY sort_order`)
      .all(category).map((row) => ({
        label: row.label,
        tag: row.tag,
      }));
  },

  getAll() {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM filters ORDER BY category, sort_order`)
      .all();
    const result = {};
    for (const row of rows) {
      if (!result[row.category]) result[row.category] = [];
      result[row.category].push({ label: row.label, tag: row.tag });
    }
    return result;
  },

  delete(category, tag) {
    const db = getDb();
    return db.prepare(`DELETE FROM filters WHERE category = ? AND tag = ?`)
      .run(category, tag).changes > 0;
  },

  deleteByCategory(category) {
    const db = getDb();
    return db.prepare(`DELETE FROM filters WHERE category = ?`)
      .run(category).changes;
  },
};

// ==================== Tag Dictionary Operations ====================

const tagDictionary = {
  upsert(category, label, tag, sortOrder = 0) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO tag_dictionary (category, label, tag, sort_order)
        VALUES (@category, @label, @tag, @sortOrder)
        ON CONFLICT(category, tag) DO UPDATE SET
          label = @label,
          sort_order = @sortOrder
      `).run({ category, label, tag, sortOrder });
      return true;
    } catch (error) {
      logger.error('Error upserting tag dictionary entry', error);
      return false;
    }
  },

  upsertMany(items, category) {
    const db = getDb();
    return db.transaction((items, category) => {
      for (let i = 0; i < items.length; i++) {
        tagDictionary.upsert(category, items[i].label, items[i].tag, i);
      }
      return items.length;
    })(items, category);
  },

  getByCategory(category) {
    const db = getDb();
    return db.prepare(`SELECT * FROM tag_dictionary WHERE category = ? ORDER BY sort_order`)
      .all(category).map((row) => ({
        label: row.label,
        tag: row.tag,
      }));
  },

  getAll() {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM tag_dictionary ORDER BY category, sort_order`)
      .all();
    const result = {};
    for (const row of rows) {
      if (!result[row.category]) result[row.category] = [];
      result[row.category].push({ label: row.label, tag: row.tag });
    }
    return result;
  },

  delete(category, tag) {
    const db = getDb();
    return db.prepare(`DELETE FROM tag_dictionary WHERE category = ? AND tag = ?`)
      .run(category, tag).changes > 0;
  },

  deleteByCategory(category) {
    const db = getDb();
    return db.prepare(`DELETE FROM tag_dictionary WHERE category = ?`)
      .run(category).changes;
  },
};

// ==================== Admin Settings Operations ====================

const adminSettings = {
  get(key) {
    const db = getDb();
    const row = db.prepare(`SELECT value FROM admin_settings WHERE key = ?`).get(key);
    return row ? row.value : null;
  },
  set(key, value) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO admin_settings (key, value, updated_at)
        VALUES (@key, @value, @updatedAt)
        ON CONFLICT(key) DO UPDATE SET
          value = @value,
          updated_at = @updatedAt
      `).run({
        key,
        value,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      logger.error('Error setting admin setting', error);
      return false;
    }
  },
};

// 数据库健康检查函数
const checkDatabaseHealth = () => {
  try {
    if (!db) {
      logger.warn('Database connection lost, attempting to reconnect...');
      initDatabase();
      return false;
    }

    // 执行简单查询检查连接
    db.prepare('SELECT 1').get();
    return true;
  } catch (error) {
    logger.error('Database health check failed', { message: error.message });
    // 尝试重新初始化
    try {
      initDatabase();
      return true;
    } catch (reinitError) {
      logger.error('Database reinitialization failed', { message: reinitError.message });
      return false;
    }
  }
};

// 包装数据库操作，添加错误处理和重试（同步版本，因为 better-sqlite3 是同步的）
const withDatabaseRetry = (operation, maxRetries = 3) => {
  return (...args) => {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 检查数据库健康状态
        if (!checkDatabaseHealth()) {
          throw new Error('Database connection unavailable');
        }

        return operation(...args);
      } catch (error) {
        lastError = error;

        // 如果是数据库锁定错误，等待后重试
        if (error.code === 'SQLITE_BUSY' || error.message.includes('database is locked')) {
          if (attempt < maxRetries) {
            const waitTime = attempt * 100; // 递增等待时间
            logger.warn(`Database busy, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`);
            // 同步等待（使用 busy-wait，因为 better-sqlite3 是同步的）
            const start = Date.now();
            while (Date.now() - start < waitTime) {
              // Busy wait
            }
            continue;
          }
        }

        // 如果是连接错误或加载错误，尝试重新初始化
        if (error.code === 'SQLITE_CANTOPEN' || error.code === 'SQLITE_IOERR' || error.code === 'ERR_DLOPEN_FAILED') {
          if (attempt < maxRetries) {
            logger.warn(`Database connection error, reinitializing (attempt ${attempt}/${maxRetries})...`);
            try {
              initDatabase();
              // 短暂等待
              const start = Date.now();
              while (Date.now() - start < 200) {
                // Busy wait
              }
              continue;
            } catch (reinitError) {
              logger.error('Database reinitialization failed', reinitError);
            }
          }
        }

        // 其他错误直接抛出
        throw error;
      }
    }

    throw lastError;
  };
};

// Periodic cleanup (every hour) with error handling
setInterval(() => {
  try {
    if (checkDatabaseHealth()) {
      tokens.cleanup();
      accessKeys.cleanup();
    }
  } catch (error) {
    logger.error('Error during periodic cleanup', { message: error.message });
  }
}, 60 * 60 * 1000);

// 数据库健康检查（每5分钟）
setInterval(() => {
  checkDatabaseHealth();
}, 5 * 60 * 1000);

// 导出数据库对象，使用 getter 确保总是返回有效的连接
const getDb = () => {
  if (!db || !checkDatabaseHealth()) {
    db = initDatabase();
  }
  return db;
};

module.exports = {
  get db() {
    return getDb();
  },
  initDatabase,
  checkDatabaseHealth,
  tokens,
  tokenOps,
  accessKeys,
  resources,
  filters,
  tagDictionary,
  adminSettings,
};
