const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'kktools.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ==================== Initialize Tables ====================

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
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

// 添加新列（如果不存在）
try {
  db.exec(`ALTER TABLE access_keys ADD COLUMN user_type TEXT DEFAULT 'user'`);
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
`);

console.log('📦 Database initialized successfully');

// ==================== Token Operations ====================

const tokenOps = {
  add: db.prepare(`
    INSERT INTO tokens (token, type, ip_address, access_key_code, created_at, expires_at) 
    VALUES (@token, @type, @ipAddress, @accessKeyCode, @createdAt, @expiresAt)
  `),
  verify: db.prepare(`
    SELECT * FROM tokens 
    WHERE token = ? AND (expires_at IS NULL OR expires_at > ?)
  `),
  delete: db.prepare(`DELETE FROM tokens WHERE token = ?`),
  deleteByAccessKey: db.prepare(`DELETE FROM tokens WHERE access_key_code = ? AND type = 'starlight'`),
  findByAccessKey: db.prepare(`SELECT * FROM tokens WHERE access_key_code = ? AND type = 'starlight' AND (expires_at IS NULL OR expires_at > ?)`),
  cleanup: db.prepare(`DELETE FROM tokens WHERE expires_at IS NOT NULL AND expires_at < ?`),
};

const tokens = {
  add(token, type = 'admin', expiresAt = null, ipAddress = null, accessKeyCode = null) {
    try {
      tokenOps.add.run({ 
        token, 
        type, 
        ipAddress, 
        accessKeyCode,
        createdAt: Date.now(), 
        expiresAt 
      });
      return true;
    } catch (error) {
      console.error('Error adding token:', error);
      return false;
    }
  },
  verify(token) {
    return !!tokenOps.verify.get(token, Date.now());
  },
  // 获取 token 类型（admin 或 starlight）
  getType(token) {
    const row = tokenOps.verify.get(token, Date.now());
    return row ? row.type : null;
  },
  // 验证是否是管理员 token
  isAdmin(token) {
    return this.getType(token) === 'admin';
  },
  // 检查访问密钥是否已被其他 IP 使用
  isAccessKeyInUse(accessKeyCode, currentIp) {
    const existingTokens = tokenOps.findByAccessKey.all(accessKeyCode, Date.now());
    if (existingTokens.length === 0) {
      return false;
    }
    // 检查是否有其他 IP 在使用
    const otherIpTokens = existingTokens.filter(t => t.ip_address !== currentIp);
    return otherIpTokens.length > 0;
  },
  // 删除指定访问密钥的所有 token（用于强制下线）
  deleteByAccessKey(accessKeyCode) {
    return tokenOps.deleteByAccessKey.run(accessKeyCode).changes;
  },
  delete(token) {
    return tokenOps.delete.run(token).changes > 0;
  },
  cleanup() {
    const result = tokenOps.cleanup.run(Date.now());
    if (result.changes > 0) console.log(`🧹 Cleaned up ${result.changes} expired tokens`);
    return result.changes;
  },
};

// ==================== Access Key Operations ====================

const keyOps = {
  add: db.prepare(`
    INSERT INTO access_keys (code, username, user_type, duration, created_at, expires_at)
    VALUES (@code, @username, @userType, @duration, @createdAt, @expiresAt)
  `),
  findByCode: db.prepare(`SELECT * FROM access_keys WHERE code = ?`),
  getAll: db.prepare(`SELECT * FROM access_keys WHERE expires_at > ?`),
  delete: db.prepare(`DELETE FROM access_keys WHERE code = ?`),
  updateName: db.prepare(`UPDATE access_keys SET name = ? WHERE code = ?`),
  cleanup: db.prepare(`DELETE FROM access_keys WHERE expires_at < ?`),
};

const accessKeys = {
  add(code, username, durationInDays, userType = 'user') {
    const now = Date.now();
    const expiresAt = now + durationInDays * 24 * 60 * 60 * 1000;
    try {
      keyOps.add.run({ code, username, userType, duration: durationInDays, createdAt: now, expiresAt });
      return { code, username, userType, duration: durationInDays, createdAt: now, expiresAt };
    } catch (error) {
      console.error('Error adding access key:', error);
      return null;
    }
  },
  findByCode(code) {
    return keyOps.findByCode.get(code.trim().toUpperCase());
  },
  getAll() {
    keyOps.cleanup.run(Date.now());
    return keyOps.getAll.all(Date.now()).map((row) => ({
      code: row.code,
      username: row.username,
      name: row.name,
      userType: row.user_type || 'user',
      duration: row.duration,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));
  },
  delete(code) {
    return keyOps.delete.run(code).changes > 0;
  },
  updateName(code, name) {
    const result = keyOps.updateName.run(name, code);
    return result.changes > 0 ? this.findByCode(code) : null;
  },
  isExpired(key) {
    return Date.now() > key.expires_at;
  },
  cleanup() {
    const result = keyOps.cleanup.run(Date.now());
    if (result.changes > 0) console.log(`🧹 Cleaned up ${result.changes} expired access keys`);
    return result.changes;
  },
};

// ==================== Resource Operations ====================

const resourceOps = {
  upsert: db.prepare(`
    INSERT INTO resources (id, title, description, category, tags, image_url, link, featured, content_type, content, sort_order, created_at, updated_at)
    VALUES (@id, @title, @description, @category, @tags, @imageUrl, @link, @featured, @contentType, @content, @sortOrder, @createdAt, @updatedAt)
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
      sort_order = @sortOrder,
      updated_at = @updatedAt
  `),
  getByCategory: db.prepare(`SELECT * FROM resources WHERE category = ? ORDER BY sort_order, title`),
  getAll: db.prepare(`SELECT * FROM resources ORDER BY category, sort_order, title`),
  getById: db.prepare(`SELECT * FROM resources WHERE id = ?`),
  delete: db.prepare(`DELETE FROM resources WHERE id = ?`),
  deleteByCategory: db.prepare(`DELETE FROM resources WHERE category = ?`),
};

const resources = {
  upsert(resource) {
    const now = Date.now();
    try {
      resourceOps.upsert.run({
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
        sortOrder: resource.sortOrder || resource.sort_order || 0,
        createdAt: resource.createdAt || now,
        updatedAt: now,
      });
      return true;
    } catch (error) {
      console.error('Error upserting resource:', error);
      // 如果是唯一约束冲突，提供更详细的错误信息
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || (error.message && error.message.includes('UNIQUE constraint'))) {
        console.error(`资源ID冲突: ${resource.id}`);
      }
      return false;
    }
  },

  upsertMany: db.transaction((items) => {
    for (const item of items) {
      resources.upsert(item);
    }
    return items.length;
  }),

  getByCategory(category) {
    return resourceOps.getByCategory.all(category).map(this._mapRow);
  },

  getAll() {
    return resourceOps.getAll.all().map(this._mapRow);
  },

  getById(id) {
    const row = resourceOps.getById.get(id);
    return row ? this._mapRow(row) : null;
  },

  delete(id) {
    return resourceOps.delete.run(id).changes > 0;
  },

  deleteByCategory(category) {
    return resourceOps.deleteByCategory.run(category).changes;
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
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

// ==================== Filter Operations ====================

const filterOps = {
  upsert: db.prepare(`
    INSERT INTO filters (category, label, tag, sort_order)
    VALUES (@category, @label, @tag, @sortOrder)
    ON CONFLICT(category, tag) DO UPDATE SET
      label = @label,
      sort_order = @sortOrder
  `),
  getByCategory: db.prepare(`SELECT * FROM filters WHERE category = ? ORDER BY sort_order`),
  getAll: db.prepare(`SELECT * FROM filters ORDER BY category, sort_order`),
  delete: db.prepare(`DELETE FROM filters WHERE category = ? AND tag = ?`),
  deleteByCategory: db.prepare(`DELETE FROM filters WHERE category = ?`),
};

const filters = {
  upsert(category, label, tag, sortOrder = 0) {
    try {
      filterOps.upsert.run({ category, label, tag, sortOrder });
      return true;
    } catch (error) {
      console.error('Error upserting filter:', error);
      return false;
    }
  },

  upsertMany: db.transaction((items, category) => {
    for (let i = 0; i < items.length; i++) {
      filters.upsert(category, items[i].label, items[i].tag, i);
    }
    return items.length;
  }),

  getByCategory(category) {
    return filterOps.getByCategory.all(category).map((row) => ({
      label: row.label,
      tag: row.tag,
    }));
  },

  getAll() {
    const rows = filterOps.getAll.all();
    const result = {};
    for (const row of rows) {
      if (!result[row.category]) result[row.category] = [];
      result[row.category].push({ label: row.label, tag: row.tag });
    }
    return result;
  },

  delete(category, tag) {
    return filterOps.delete.run(category, tag).changes > 0;
  },

  deleteByCategory(category) {
    return filterOps.deleteByCategory.run(category).changes;
  },
};

// ==================== Admin Settings Operations ====================

const adminSettingsOps = {
  get: db.prepare(`SELECT value FROM admin_settings WHERE key = ?`),
  set: db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = @value,
      updated_at = @updatedAt
  `),
};

const adminSettings = {
  get(key) {
    const row = adminSettingsOps.get.get(key);
    return row ? row.value : null;
  },
  set(key, value) {
    try {
      adminSettingsOps.set.run({
        key,
        value,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('Error setting admin setting:', error);
      return false;
    }
  },
};

// Periodic cleanup (every hour)
setInterval(() => {
  tokens.cleanup();
  accessKeys.cleanup();
}, 60 * 60 * 1000);

module.exports = {
  db,
  tokens,
  tokenOps, // 导出 tokenOps 供外部使用
  accessKeys,
  resources,
  filters,
  adminSettings,
};
