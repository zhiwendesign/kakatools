const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const compression = require('compression');
const helmet = require('helmet');
const multer = require('multer');

// Import utilities
const logger = require('./utils/logger');
const RateLimiter = require('./utils/rateLimiter');
const AdvancedCache = require('./utils/cache');

// Import database operations
const { tokens, tokenOps, accessKeys, resources, filters, tagDictionary, adminSettings } = require('./db');

const app = express();
const PORT = process.env.PORT || 4200;
const FRONTEND_DEV_PORT = process.env.FRONTEND_DEV_PORT || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

// 检测是否有前端静态文件（用于判断是否同域部署）
const FRONTEND_DIST_PATH = path.join(__dirname, '../frontend/out');
const HAS_FRONTEND_DIST = fs.existsSync(FRONTEND_DIST_PATH);

// ==================== Middleware ====================

// 安全头设置（生产环境）
if (!IS_DEV) {
  app.use(helmet({
    contentSecurityPolicy: false, // 允许内联脚本（Next.js 需要）
    crossOriginEmbedderPolicy: false,
  }));
}

// 响应压缩
app.use(compression());

// CORS 配置
app.use(cors({
  origin: true,
  credentials: true
}));

// 处理尾部斜杠 - 移除 URL 末尾的斜杠，确保路由同时支持带斜杠和不带斜杠的请求
app.use((req, res, next) => {
  if (req.url.endsWith('/') && req.url.length > 1) {
    req.url = req.url.slice(0, -1);
  }
  next();
});

// 请求体解析 - 增加大小限制
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

// 请求超时处理（30秒）
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: '请求超时'
      });
    }
  });
  next();
});

// 请求限流（优化的限流器）
const rateLimiter = new RateLimiter(60 * 1000, 300); // 1分钟，300个请求（提升阈值，减少误限流）
// 登录端点专用限流器（更宽松：1分钟内10次尝试）
const loginRateLimiter = new RateLimiter(60 * 1000, 10); // 1分钟，10次登录尝试

const rateLimitMiddleware = (req, res, next) => {
  // 跳过健康检查和登录相关端点的限流（登录端点使用专门的限流器）
  if (req.path === '/api/health' ||
    req.path === '/api/auth/login' ||
    req.path === '/api/auth/verify' ||
    req.path === '/api/keys/verify') {
    return next();
  }

  // 跳过预检请求
  if (req.method === 'OPTIONS') {
    return next();
  }

  // 跳过静态资源与前端构建产物（减少误限流）
  const p = req.path || '';
  if (req.method === 'GET' && (
    p.startsWith('/data/') ||         // 后端静态数据与上传图片
    p.startsWith('/data') ||
    p.startsWith('/_next') ||         // Next.js 静态资源
    p.startsWith('/static') ||
    p.startsWith('/favicon') ||
    p.startsWith('/images')
  )) {
    return next();
  }

  const clientIp = getClientIp(req);
  const result = rateLimiter.check(clientIp);

  if (!result.allowed) {
    const resetTime = new Date(result.resetAt).toISOString();
    res.set('X-RateLimit-Limit', '300');
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', result.resetAt.toString());
    return res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      resetAt: resetTime
    });
  }

  // 设置限流响应头
  res.set('X-RateLimit-Limit', '300');
  res.set('X-RateLimit-Remaining', result.remaining.toString());

  next();
};

app.use(rateLimitMiddleware);

// 请求日志中间件（使用统一日志系统）
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;

    // 更新统计信息
    stats.requests.total++;
    if (res.statusCode >= 400) {
      stats.requests.errors++;
    } else if (res.statusCode < 300) {
      stats.requests.success++;
    }
    if (duration > 1000) {
      stats.requests.slow++;
    }

    // 使用统一日志系统
    logger.request(req, res, duration);

    originalSend.call(this, data);
  };

  next();
});

// 统一错误处理中间件
const errorHandler = (err, req, res, next) => {
  // 记录详细错误信息
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  // 使用统一日志系统
  logger.error('Request error', errorInfo);

  // 如果是数据库错误，记录更多信息
  if (err.code && err.code.startsWith('SQLITE_')) {
    logger.error('Database error', {
      code: err.code,
      message: err.message,
      path: req.path,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  // 如果响应已发送，委托给默认错误处理
  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    success: false,
    message: IS_DEV ? message : '服务器错误',
    ...(IS_DEV && { stack: err.stack })
  });
};

// Serve static data files
app.use('/data', express.static(path.join(__dirname, 'data')));

// ==================== Image Upload Configuration ====================

// 图片上传目录
const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳 + 随机字符串 + 原始扩展名
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  },
});

// 获取服务器基础URL（用于生成完整的图片URL）
const getBaseUrl = (req) => {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `${req.hostname}:${PORT}`;
  return `${protocol}://${host}`;
};

// 密码配置 - 使用环境变量或默认哈希值
// 默认密码哈希对应明文密码: 'admin123' (请在生产环境中修改)
const DEFAULT_ADMIN_PASSWORD_HASH = '$2b$10$fqSNTFsk5LB9SxUC0qr5.uW9mv/Ty89y.RvUJ4lcHcbyCvV2Zp01W';

// 获取管理员密码哈希 - 优先使用数据库，然后是环境变量，最后是默认值
const getAdminPasswordHash = () => {
  let dbHash = null;
  
  try {
    // 先从数据库读取（可能会失败，如果数据库连接有问题）
    dbHash = adminSettings.get('admin_password_hash');
  } catch (error) {
    logger.warn('Failed to read password hash from database, falling back to environment or default', { message: error.message });
  }
  
  if (dbHash && validatePasswordHashFormat(dbHash)) {
    return dbHash;
  }

  // 如果数据库没有，使用环境变量
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  if (envHash && validatePasswordHashFormat(envHash)) {
    try {
      // 将环境变量的哈希保存到数据库（如果数据库可用）
      adminSettings.set('admin_password_hash', envHash);
    } catch (error) {
      logger.warn('Failed to save password hash to database', { message: error.message });
    }
    return envHash;
  }

  // 最后使用默认值
  if (validatePasswordHashFormat(DEFAULT_ADMIN_PASSWORD_HASH)) {
    try {
      // 将默认哈希保存到数据库（如果数据库可用）
      adminSettings.set('admin_password_hash', DEFAULT_ADMIN_PASSWORD_HASH);
    } catch (error) {
      logger.warn('Failed to save default password hash to database', { message: error.message });
    }
    return DEFAULT_ADMIN_PASSWORD_HASH;
  }

  return DEFAULT_ADMIN_PASSWORD_HASH;
};

// 验证密码哈希格式是否有效（不验证具体密码，只检查格式）
const validatePasswordHashFormat = (hash) => {
  // bcrypt 哈希格式: $2a$, $2b$, or $2y$ 开头，长度约60字符
  return hash && typeof hash === 'string' && hash.startsWith('$2') && hash.length >= 59;
};

// 在启动时初始化密码哈希
const initializePasswordHash = async () => {
  const hash = getAdminPasswordHash();
  if (validatePasswordHashFormat(hash)) {
    logger.info('管理员密码哈希已初始化');
  } else {
    logger.warn('密码哈希格式无效，使用默认哈希');
  }
};

// 预置示例数据（仅在资源为空时）
const seedIfEmpty = () => {
  try {
    const current = resources.getAll();
    if (current.length === 0) {
      const SAMPLE_DATA = require('./sample-data');
      let filtersCount = 0;
      let resourcesCount = 0;
      for (const [category, data] of Object.entries(SAMPLE_DATA)) {
        if (data.filters && data.filters.length > 0) {
          filtersCount += filters.upsertMany(data.filters, category);
        }
        if (data.resources && data.resources.length > 0) {
          const withCategory = data.resources.map((r, index) => ({
            ...r,
            category,
            sortOrder: index,
          }));
          resourcesCount += resources.upsertMany(withCategory);
        }
      }
      logger.info(`Seeded sample data: ${resourcesCount} resources, ${filtersCount} filters`);
    }
  } catch (e) {
    logger.warn('Seed sample data failed', { error: e?.message || e });
  }
};

// Generate a simple random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 获取客户端 IP 地址
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
};

// ==================== Auth Routes ====================

// Login Endpoint
app.post('/api/auth/login', async (req, res, next) => {
  try {
    // 应用登录专用速率限制
    const clientIp = getClientIp(req);
    const loginLimitResult = loginRateLimiter.check(clientIp);

    if (!loginLimitResult.allowed) {
      const resetTime = new Date(loginLimitResult.resetAt).toISOString();
      res.set('X-RateLimit-Limit', '10');
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', loginLimitResult.resetAt.toString());
      return res.status(429).json({
        success: false,
        message: '登录尝试过于频繁，请稍后再试',
        resetAt: resetTime
      });
    }

    res.set('X-RateLimit-Limit', '10');
    res.set('X-RateLimit-Remaining', loginLimitResult.remaining.toString());

    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: '密码不能为空' });
    }

    const currentHash = getAdminPasswordHash();
    const isValidPassword = await bcrypt.compare(password, currentHash);

    if (isValidPassword) {
      const token = generateToken();
      const clientIp = getClientIp(req);
      const stored = tokens.add(token, 'admin', null, clientIp, null);

      if (!stored) {
        const error = new Error('无法保存登录状态');
        error.statusCode = 500;
        return next(error);
      }

      const verified = tokens.verify(token);
      if (!verified) {
        const error = new Error('登录状态验证失败');
        error.statusCode = 500;
        return next(error);
      }

      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: '密码错误' });
    }
  } catch (error) {
    next(error);
  }
});

// Verify Token Endpoint
app.post('/api/auth/verify', (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token && tokens.verify(token)) {
      const tokenType = tokens.getType(token);

      // If it's a starlight token, return keyInfo
      if (tokenType === 'starlight') {
        // Get token details to find access key code
        const db = require('./db').db;
        const tokenRow = db.prepare(`
          SELECT * FROM tokens 
          WHERE token = ? AND (expires_at IS NULL OR expires_at > ?)
        `).get(token, Date.now());
        
        if (tokenRow && tokenRow.access_key_code) {
          const key = accessKeys.findByCode(tokenRow.access_key_code);
          if (key) {
            return res.json({
              success: true,
              keyInfo: {
                code: key.code,
                username: key.username,
                name: key.name || null,
                userType: key.user_type || 'user',
                percentage: key.percentage !== null && key.percentage !== undefined ? key.percentage : 100,
                createdAt: key.created_at,
                expiresAt: key.expires_at,
                duration: key.duration
              }
            });
          }
        }
      }

      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } catch (error) {
    next(error);
  }
});

// Logout Endpoint
app.post('/api/auth/logout', (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      tokens.delete(token);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Auth middleware for admin routes
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.warn('requireAuth: No token provided', { path: req.path, method: req.method });
      return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }

    const isValid = tokens.verify(token);
    if (!isValid) {
      logger.warn('requireAuth: Invalid token', { path: req.path, method: req.method, tokenLength: token.length });
      return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }

    next();
  } catch (error) {
    logger.error('requireAuth: Error', error);
    next(error);
  }
};

// Generate new password hash (Admin Only) - 仅生成，不更新
app.post('/api/auth/generate-password-hash', requireAuth, async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度至少6位'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    logger.info('新的密码哈希已生成', { hash: newHash });

    res.json({
      success: true,
      message: '新密码哈希已生成，请查看服务器日志获取哈希值',
      hash: newHash,
      note: '请将生成的哈希值设置为环境变量 ADMIN_PASSWORD_HASH'
    });
  } catch (error) {
    next(error);
  }
});

// Update admin password (Admin Only)
app.post('/api/auth/update-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: '当前密码不能为空'
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度至少6位'
      });
    }

    // 验证当前密码
    const currentHash = getAdminPasswordHash();
    const isValidPassword = await bcrypt.compare(currentPassword, currentHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 生成新密码哈希
    const newHash = await bcrypt.hash(newPassword, 10);

    // 保存到数据库
    const success = adminSettings.set('admin_password_hash', newHash);

    if (success) {
      logger.info('管理员密码已更新');
      res.json({
        success: true,
        message: '密码更新成功'
      });
    } else {
      const error = new Error('密码更新失败');
      error.statusCode = 500;
      return next(error);
    }
  } catch (error) {
    next(error);
  }
});

// ==================== Access Keys Routes ====================

// Generate Access Key (Admin Only)
app.post('/api/keys/generate', requireAuth, (req, res, next) => {
  try {
    const { durationInDays = 30, username = 'Anonymous', userType = 'user', percentage = 100 } = req.body;

    if (durationInDays && (typeof durationInDays !== 'number' || durationInDays < 1 || durationInDays > 365)) {
      return res.status(400).json({ success: false, message: '有效期必须在1-365天之间' });
    }

    // 验证 userType
    if (userType !== 'user' && userType !== 'admin') {
      return res.status(400).json({ success: false, message: '密钥类型必须是 user 或 admin' });
    }

    // 验证 percentage - 修复：确保 percentage 是数字类型
    let validPercentage = percentage;
    if (percentage !== undefined && percentage !== null) {
      const numPercentage = typeof percentage === 'string' ? parseInt(percentage, 10) : percentage;
      if (isNaN(numPercentage) || numPercentage < 0 || numPercentage > 100) {
        return res.status(400).json({ success: false, message: '百分比必须在0-100之间' });
      }
      validPercentage = numPercentage;
    } else {
      validPercentage = 100;
    }

    const code = crypto.randomBytes(16).toString('hex').toUpperCase();
    const newKey = accessKeys.add(code, username || 'Anonymous', durationInDays || 30, userType, validPercentage);

    if (newKey) {
      res.json({ success: true, key: newKey });
    } else {
      const error = new Error('Failed to generate key');
      error.statusCode = 500;
      return next(error);
    }
  } catch (error) {
    next(error);
  }
});

// Verify Access Key (Public)
app.post('/api/keys/verify', (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Key is required' });
    }

    const key = accessKeys.findByCode(code.trim());

    if (!key) {
      return res.status(401).json({ success: false, message: 'Invalid Access Key' });
    }

    if (accessKeys.isExpired(key)) {
      accessKeys.delete(code);
      return res.status(401).json({ success: false, message: 'Access Key has expired' });
    }

    // 获取客户端 IP
    const clientIp = getClientIp(req);

    // 检查访问密钥是否已被其他 IP 使用（单设备限制）
    if (tokens.isAccessKeyInUse(key.code, clientIp)) {
      return res.status(403).json({
        success: false,
        message: '此访问密钥已在其他设备上激活，无法在当前设备使用。如需更换设备，请联系管理员重置密钥。'
      });
    }

    // 如果当前 IP 已有 token，先删除旧的（允许同一 IP 重新登录）
    const existingTokens = tokenOps.findByAccessKey.all(key.code, Date.now());
    const currentIpTokens = existingTokens.filter(t => t.ip_address === clientIp);
    currentIpTokens.forEach(t => tokens.delete(t.token));

    // 创建 starlight 类型的 token
    const accessToken = generateToken();
    const keyExpiresAt = key.expires_at;
    tokens.add(accessToken, 'starlight', keyExpiresAt, clientIp, key.code);

    logger.info('Starlight access granted', { key: key.code, ip: clientIp, userType: key.user_type });

    res.json({
      success: true,
      message: 'Access Granted',
      token: accessToken,
      keyInfo: {
        code: key.code,
        username: key.username,
        name: key.name || null,
        userType: key.user_type || 'user',
        percentage: key.percentage !== null && key.percentage !== undefined ? key.percentage : 100,
        createdAt: key.created_at,
        expiresAt: key.expires_at,
        duration: key.duration
      }
    });
  } catch (error) {
    next(error);
  }
});

// List Access Keys (Admin Only)
app.get('/api/keys', requireAuth, (req, res, next) => {
  try {
    const keys = accessKeys.getAll();
    res.json({ success: true, keys });
  } catch (error) {
    next(error);
  }
});

// Revoke Access Key (Admin Only)
app.delete('/api/keys/:code', requireAuth, (req, res, next) => {
  try {
    const { code } = req.params;
    const deleted = accessKeys.delete(code);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Key not found' });
    }

    res.json({ success: true, message: 'Key revoked' });
  } catch (error) {
    next(error);
  }
});

// Rename Access Key (Admin Only)
app.put('/api/keys/:code', requireAuth, (req, res, next) => {
  try {
    const { code } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const key = accessKeys.updateName(code, name.trim());

    if (!key) {
      return res.status(404).json({ success: false, message: 'Key not found' });
    }

    res.json({
      success: true,
      message: 'Key renamed',
      key: {
        code: key.code,
        username: key.username,
        name: key.name,
        duration: key.duration,
        createdAt: key.created_at,
        expiresAt: key.expires_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Resources Routes ====================

// 管理员专属分类列表
const ADMIN_ONLY_CATEGORIES = ['Learning'];

// Get resources by category
app.get('/api/resources/:category', (req, res, next) => {
  try {
    const { category } = req.params;

    // 检查是否是管理员专属分类
    if (ADMIN_ONLY_CATEGORIES.includes(category)) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      // 检查是否有管理员权限（admin token 或 admin-type key）
      let hasAccess = false;
      if (token) {
        if (tokens.isAdmin(token)) {
          hasAccess = true;
        } else if (tokens.getType(token) === 'starlight') {
          // 检查 starlight token 对应的访问密钥类型
          const tokenRow = tokenOps.verify.get(token, Date.now());
          if (tokenRow && tokenRow.access_key_code) {
            const key = accessKeys.findByCode(tokenRow.access_key_code);
            hasAccess = key && key.user_type === 'admin';
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: '此分类仅管理员可访问',
          filters: [],
          resources: []
        });
      }
    }

    // 尝试从缓存获取
    const cacheKey = `resources:${category}`;
    const cached = dataCache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    // 从数据库获取
    const categoryResources = resources.getByCategory(category);
    const categoryFilters = filters.getByCategory(category);
    const categoryTagDict = tagDictionary.getByCategory(category);

    const result = {
      filters: categoryFilters,
      tagDictionary: categoryTagDict,
      resources: categoryResources
    };

    // 缓存结果（非管理员专属分类才缓存）
    if (!ADMIN_ONLY_CATEGORIES.includes(category)) {
      dataCache.set(cacheKey, result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get all resources
app.get('/api/resources', (req, res, next) => {
  try {
    const allResources = resources.getAll();
    const allFilters = filters.getAll();
    const allTagDict = tagDictionary.getAll();

    res.json({
      filters: allFilters,
      tagDictionary: allTagDict,
      resources: allResources
    });
  } catch (error) {
    next(error);
  }
});

// Add/Update resource (Admin Only)
app.post('/api/resources', requireAuth, (req, res, next) => {
  try {
    const resource = req.body;

    if (!resource.id || !resource.title || !resource.category) {
      return res.status(400).json({ success: false, message: 'Missing required fields: id, title, category' });
    }

    const success = resources.upsert(resource);

    if (success) {
      // 清除相关缓存
      dataCache.delete(`resources:${resource.category}`);
      dataCache.delete('resources:all');

      res.json({ success: true, resource: resources.getById(resource.id) });
    } else {
      const error = new Error('Failed to save resource');
      error.statusCode = 500;
      return next(error);
    }
  } catch (error) {
    next(error);
  }
});

// Batch add resources (Admin Only)
app.post('/api/resources/batch', requireAuth, (req, res, next) => {
  try {
    const resourcesList = req.body.resources || req.body;

    if (!Array.isArray(resourcesList) || resourcesList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Resources array is required and cannot be empty'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // 批量保存资源
    resourcesList.forEach((resource, index) => {
      try {
        if (!resource.id || !resource.title || !resource.category) {
          results.failed++;
          results.errors.push({
            index: index + 1,
            message: '缺少必需字段: id, title, category'
          });
          return;
        }

        // 验证分类是否有效
        const validCategories = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];
        if (!validCategories.includes(resource.category)) {
          results.failed++;
          results.errors.push({
            index: index + 1,
            message: `无效的分类: ${resource.category}`
          });
          return;
        }

        // 确保tags是数组
        if (resource.tags && !Array.isArray(resource.tags)) {
          resource.tags = [];
        }

        const success = resources.upsert(resource);
        if (success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            index: index + 1,
            message: `保存失败: ${resource.title || resource.id}`
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: index + 1,
          message: `处理失败: ${error.message || '未知错误'}`
        });
        logger.error(`批量保存第 ${index + 1} 条资源时出错`, error);
      }
    });

    if (results.success > 0) {
      res.json({
        success: true,
        message: `成功保存 ${results.success} 条资源${results.failed > 0 ? `，失败 ${results.failed} 条` : ''}`,
        results: {
          total: resourcesList.length,
          success: results.success,
          failed: results.failed,
          errors: results.errors,
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: '所有资源保存失败',
        results: {
          total: resourcesList.length,
          success: 0,
          failed: results.failed,
          errors: results.errors,
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// Delete resource (Admin Only)
app.delete('/api/resources/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;

    // 先获取资源信息，以便清除缓存
    const resource = resources.getById(id);
    const deleted = resources.delete(id);

    if (deleted) {
      // 清除相关缓存
      if (resource) {
        dataCache.delete(`resources:${resource.category}`);
      }
      dataCache.delete('resources:all');

      res.json({ success: true, message: 'Resource deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Resource not found' });
    }
  } catch (error) {
    next(error);
  }
});

// ==================== Filters Routes ====================

// Get filters by category
app.get('/api/filters/:category', (req, res, next) => {
  try {
    const { category } = req.params;
    const categoryFilters = filters.getByCategory(category);
    res.json({ filters: categoryFilters });
  } catch (error) {
    next(error);
  }
});

// Add filter (Admin Only)
app.post('/api/filters', requireAuth, (req, res, next) => {
  try {
    const { category, label, tag } = req.body;

    if (!category || !label || !tag) {
      return res.status(400).json({ success: false, message: 'Missing required fields: category, label, tag' });
    }

    const success = filters.upsert(category, label, tag);

    if (success) {
      res.json({ success: true, filters: filters.getByCategory(category) });
    } else {
      const error = new Error('Failed to save filter');
      error.statusCode = 500;
      return next(error);
    }
  } catch (error) {
    next(error);
  }
});

// Delete filter (Admin Only)
app.delete('/api/filters/:category/:tag', requireAuth, (req, res, next) => {
  try {
    const { category, tag } = req.params;
    const normalizedTag = (tag || '').trim();
    let deleted = false;

    // First try exact delete with trimmed tag
    deleted = filters.delete(category, normalizedTag);

    // Fallback: case-insensitive or label match
    if (!deleted) {
      const categoryFilters = filters.getByCategory(category);
      const match = categoryFilters.find(f =>
        (f.tag || '').trim().toLowerCase() === normalizedTag.toLowerCase() ||
        (f.label || '').trim().toLowerCase() === normalizedTag.toLowerCase()
      );
      if (match) {
        deleted = filters.delete(category, match.tag);
      }
    }

    if (deleted) {
      // Clear related caches
      try {
        const cacheKey = `resources:${category}`;
        dataCache.delete(cacheKey);
      } catch (e) {}
      res.json({ success: true, message: 'Filter deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Filter not found' });
    }
  } catch (error) {
    next(error);
  }
});

// ==================== Tag Dictionary Routes ====================
// Add tag dictionary entry (Admin Only)
app.post('/api/tag-dictionary', requireAuth, (req, res, next) => {
  try {
    const { category, label, tag } = req.body;
    if (!category || !label || !tag) {
      return res.status(400).json({ success: false, message: 'Missing required fields: category, label, tag' });
    }
    const ok = tagDictionary.upsert(category, label, tag, 0);
    if (ok) {
      return res.json({ success: true, tagDictionary: tagDictionary.getByCategory(category) });
    }
    const err = new Error('Failed to save tag dictionary entry');
    err.statusCode = 500;
    return next(err);
  } catch (error) {
    next(error);
  }
});

// Delete tag dictionary entry (Admin Only)
app.delete('/api/tag-dictionary/:category/:tag', requireAuth, (req, res, next) => {
  try {
    const { category, tag } = req.params;
    const ok = tagDictionary.delete(category, tag);
    if (ok) {
      return res.json({ success: true, message: 'Tag dictionary entry deleted' });
    }
    return res.status(404).json({ success: false, message: 'Tag not found' });
  } catch (error) {
    next(error);
  }
});

// ==================== Header Config Routes ====================

// Get header config (Public)
app.get('/api/config/header', (req, res, next) => {
  try {
    const avatar = adminSettings.get('header_avatar') || 'K';
    const avatarImageRaw = adminSettings.get('header_avatar_image');
    const title = adminSettings.get('header_title') || '卡卡AI知识库';
    const contactImageRaw = adminSettings.get('contact_image');
    const cooperationImageRaw = adminSettings.get('cooperation_image');

    // 如果值为空字符串，返回 null
    const avatarImage = avatarImageRaw && avatarImageRaw.trim() !== '' ? avatarImageRaw : null;
    const contactImage = contactImageRaw && contactImageRaw.trim() !== '' ? contactImageRaw : null;
    const cooperationImage = cooperationImageRaw && cooperationImageRaw.trim() !== '' ? cooperationImageRaw : null;

    // 获取分类副标题配置
    const categorySubtitles = {};
    const validCategories = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];

    // 为所有分类获取副标题，确保每个分类都在返回对象中
    validCategories.forEach(category => {
      const key = `category_subtitle_${category}`;
      // 获取值，adminSettings.get() 在键不存在时返回 null
      const value = adminSettings.get(key);
      // 如果值不为空且不为空字符串，使用该值；否则返回 null
      categorySubtitles[category] = (value && value.trim() !== '') ? value : null;
    });

    res.json({
      success: true,
      config: {
        avatar,
        avatarImage,
        title,
        contactImage,
        cooperationImage,
        categorySubtitles: categorySubtitles,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Save header config (Admin Only)
app.post('/api/config/header', requireAuth, (req, res, next) => {
  try {
    const { avatar, avatarImage, title, contactImage, cooperationImage, categorySubtitles } = req.body;

    logger.debug('Saving header config', {
      hasAvatar: !!avatar,
      hasTitle: !!title,
      hasCategorySubtitles: !!categorySubtitles,
      categorySubtitlesType: typeof categorySubtitles
    });

    // 验证必填字段
    if (!avatar || !title) {
      return res.status(400).json({ success: false, message: '头像和标题不能为空' });
    }

    // 保存配置
    adminSettings.set('header_avatar', avatar);
    adminSettings.set('header_title', title);

    if (avatarImage) {
      adminSettings.set('header_avatar_image', avatarImage);
    } else {
      // 如果传 null 或空字符串，删除配置（设置为空字符串，前端会处理为 null）
      adminSettings.set('header_avatar_image', '');
    }

    if (contactImage) {
      adminSettings.set('contact_image', contactImage);
    } else {
      adminSettings.set('contact_image', '');
    }

    if (cooperationImage) {
      adminSettings.set('cooperation_image', cooperationImage);
    } else {
      adminSettings.set('cooperation_image', '');
    }

    // 保存分类副标题配置
    if (categorySubtitles && typeof categorySubtitles === 'object') {
      try {
        const validCategories = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];
        validCategories.forEach(category => {
          const key = `category_subtitle_${category}`;
          const value = categorySubtitles[category];

          if (value !== undefined && value !== null) {
            // 确保值是字符串类型
            const subtitle = typeof value === 'string' ? value.trim() : String(value).trim();
            if (subtitle !== '') {
              adminSettings.set(key, subtitle);
              logger.debug(`Saved subtitle for ${category}: ${subtitle.substring(0, 50)}...`);
            } else {
              adminSettings.set(key, '');
            }
          } else {
            // 如果值为 null 或 undefined，删除配置
            adminSettings.set(key, '');
          }
        });
      } catch (subtitleError) {
        logger.error('Error saving category subtitles', { error: subtitleError, categorySubtitles });
        // 不中断整个保存流程，只记录错误
      }
    }

    logger.info('Header config updated', { avatar, title });

    // 重新获取配置以返回最新值
    const updatedCategorySubtitles = {
      AIGC: adminSettings.get('category_subtitle_AIGC') || null,
      UXTips: adminSettings.get('category_subtitle_UXTips') || null,
      Learning: adminSettings.get('category_subtitle_Learning') || null,
      '星芒学社': adminSettings.get('category_subtitle_星芒学社') || null,
      '图库': adminSettings.get('category_subtitle_图库') || null,
    };

    // 清理空字符串
    Object.keys(updatedCategorySubtitles).forEach(key => {
      if (updatedCategorySubtitles[key] === '') {
        updatedCategorySubtitles[key] = null;
      }
    });

    res.json({
      success: true,
      message: '头部配置已保存',
      config: {
        avatar,
        avatarImage: avatarImage || null,
        title,
        contactImage: contactImage || null,
        cooperationImage: cooperationImage || null,
        categorySubtitles: updatedCategorySubtitles,
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Image Upload Routes ====================

// Upload image (Admin Only)
app.post('/api/upload/image', requireAuth, (req, res, next) => {
  // 使用 multer 中间件，并处理错误
  upload.single('image')(req, res, (err) => {
    if (err) {
      logger.error('图片上传错误:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: '文件大小超过限制（最大25MB）'
          });
        }
        return res.status(400).json({
          success: false,
          message: '上传错误：' + err.message
        });
      }
      // 其他错误（如文件类型错误）
      return res.status(400).json({
        success: false,
        message: err.message || '上传失败'
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '没有上传文件，请选择图片文件'
        });
      }

      logger.info(`图片上传成功: ${req.file.filename}, 大小: ${req.file.size} bytes`);

      const baseUrl = getBaseUrl(req);
      const imageUrl = `${baseUrl}/data/uploads/${req.file.filename}`;

      res.json({
        success: true,
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (error) {
      logger.error('处理上传文件时出错:', error);
      next(error);
    }
  });
});

// Serve uploaded images
app.use('/data/uploads', express.static(UPLOAD_DIR));

// ==================== Performance Statistics ====================
const stats = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    slow: 0, // 超过1秒的请求
  },
  startTime: Date.now(),
  lastReset: Date.now(),
};

// 数据缓存（用于频繁访问的资源数据）
const dataCache = new AdvancedCache({
  ttl: 30 * 1000, // 30秒缓存
  maxSize: 500, // 最大缓存500个项目
  cleanupInterval: 30 * 1000 // 每30秒清理一次
});

// 重置统计信息（每小时）
setInterval(() => {
  stats.requests = {
    total: 0,
    success: 0,
    errors: 0,
    slow: 0,
  };
  stats.lastReset = Date.now();
  logger.info('Statistics reset');
}, 60 * 60 * 1000);

// ==================== Health Check ====================
app.get('/api/health', (req, res) => {
  try {
    const { checkDatabaseHealth } = require('./db');
    const dbHealthy = checkDatabaseHealth();

    const memory = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(memory.rss / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024),
    };

    // 计算内存使用率
    const memoryUsagePercent = Math.round((memory.heapUsed / memory.heapTotal) * 100);

    const health = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      uptimeFormatted: formatUptime(process.uptime()),
      database: {
        type: 'sqlite',
        status: dbHealthy ? 'connected' : 'disconnected'
      },
      memory: {
        ...memoryMB,
        usagePercent: memoryUsagePercent,
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      statistics: {
        ...stats.requests,
        requestsPerMinute: Math.round(stats.requests.total / ((Date.now() - stats.lastReset) / 60000)) || 0,
        errorRate: stats.requests.total > 0 ? Math.round((stats.requests.errors / stats.requests.total) * 100) : 0,
      },
      rateLimiter: rateLimiter.getStats(),
      cache: dataCache.getStats(),
    };

    // 如果数据库不健康，返回 503 状态码
    const statusCode = dbHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// 格式化运行时间
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// 404 处理（必须在所有路由之后，错误处理之前）
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API 端点不存在'
  });
});

// 错误处理中间件（必须在所有路由之后）
app.use(errorHandler);

// ==================== Frontend Serving ====================

// 生产模式：服务静态文件
if (HAS_FRONTEND_DIST) {
  // 服务静态文件
  app.use(express.static(FRONTEND_DIST_PATH));

  // 所有非 API 路由返回前端页面（支持 SPA 路由）
  app.get('*', (req, res, next) => {
    // 跳过 API 和数据路由
    if (req.path.startsWith('/api/') || req.path.startsWith('/data/')) {
      return next();
    }

    // 检查是否有对应的静态文件（支持 trailingSlash）
    let filePath = path.join(FRONTEND_DIST_PATH, req.path);

    // 如果路径以 / 结尾，查找 index.html
    if (req.path.endsWith('/')) {
      filePath = path.join(filePath, 'index.html');
    }

    // 如果文件存在，发送文件
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }

    // 如果是目录，查找 index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }

    // 尝试添加 .html 扩展名
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }

    // 回退到首页（用于客户端路由）
    const indexPath = path.join(FRONTEND_DIST_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }

    next();
  });
} else if (IS_DEV) {
  // 开发模式：代理到 Next.js 开发服务器
  const { createProxyMiddleware } = require('http-proxy-middleware');

  const frontendProxy = createProxyMiddleware({
    target: `http://localhost:${FRONTEND_DEV_PORT}`,
    changeOrigin: true,
    ws: true, // 支持 WebSocket（热更新需要）
    logLevel: 'warn',
    onError: (err, req, res) => {
      logger.error('Proxy error', { message: err.message });
      res.status(502).json({
        error: 'Frontend dev server not running',
        message: `Please start frontend: cd frontend && npm run dev`
      });
    }
  });

  // 代理所有非 API 请求到前端开发服务器
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/data/')) {
      return next();
    }
    return frontendProxy(req, res, next);
  });
}

// ==================== Global Error Handlers ====================

// 捕获未处理的异常，防止进程崩溃
process.on('uncaughtException', (error) => {
  logger.error('[FATAL] Uncaught Exception', { error: error.message, stack: error.stack });
  // 记录错误但不立即退出，给时间处理当前请求
  // 在生产环境中，应该使用 PM2 等工具自动重启
  logger.warn('Server will continue running, but please check the error above');
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[FATAL] Unhandled Rejection', { reason, promise });
  // 记录错误但不退出进程
  logger.warn('Server will continue running, but please check the error above');
});

// 优雅关闭处理
let server = null;
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');

      // 关闭数据库连接
      try {
        const { db } = require('./db');
        if (db && typeof db.close === 'function') {
          db.close();
          logger.info('Database connection closed');
        }
      } catch (error) {
        logger.error('Error closing database', error);
      }

      // 停止限流器和缓存
      rateLimiter.stop();
      dataCache.stop();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    });

    // 强制关闭超时（10秒）
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// 监听关闭信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==================== Start Server ====================

const startServer = async () => {
  try {
    // 初始化密码哈希
    await initializePasswordHash();

    // 预置示例数据
    seedIfEmpty();

    // 启动服务器
    server = app.listen(PORT, () => {
      const memory = process.memoryUsage();
      logger.info(`Server running at http://localhost:${PORT}`);
      logger.info(`Data files served from /data`);
      logger.info(`Using SQLite database`);
      logger.info(`Error handling and graceful shutdown enabled`);
      logger.info(`Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
      logger.info(`Rate limiting: 100 requests per minute`);
      logger.info(`Request timeout: 30s`);

      if (HAS_FRONTEND_DIST) {
        logger.info(`Production mode - serving static files from ${FRONTEND_DIST_PATH}`);
      } else if (IS_DEV) {
        logger.info(`Development mode - proxying to Next.js at http://localhost:${FRONTEND_DEV_PORT}`);
        logger.info(`Start frontend first: cd frontend && npm run dev`);
      } else {
        logger.warn(`No frontend build found. Run 'npm run build' in frontend/`);
      }

      // 定期输出内存使用情况（生产环境）
      if (!IS_DEV) {
        setInterval(() => {
          const mem = process.memoryUsage();
          const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
          const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
          const rssMB = Math.round(mem.rss / 1024 / 1024);

          // 如果内存使用超过80%，发出警告
          if (heapUsedMB / heapTotalMB > 0.8) {
            logger.warn(`High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (RSS: ${rssMB}MB)`);
          } else {
            logger.debug(`Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (RSS: ${rssMB}MB)`);
          }
        }, 5 * 60 * 1000); // 每5分钟
      }
    });

    // 服务器错误处理
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        logger.error('Please change the PORT in .env or stop the other process');
      } else {
        logger.error('Server error', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();
