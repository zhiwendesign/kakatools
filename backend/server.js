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

// Import database operations
const { tokens, tokenOps, accessKeys, resources, filters, adminSettings } = require('./db');

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

// 请求体解析 - 增加大小限制
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`[${new Date().toISOString()}] ${logLevel} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
});

// 统一错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  
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
    fileSize: 5 * 1024 * 1024, // 5MB
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
  // 先从数据库读取
  const dbHash = adminSettings.get('admin_password_hash');
  if (dbHash && validatePasswordHashFormat(dbHash)) {
    return dbHash;
  }
  
  // 如果数据库没有，使用环境变量
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  if (envHash && validatePasswordHashFormat(envHash)) {
    // 将环境变量的哈希保存到数据库
    adminSettings.set('admin_password_hash', envHash);
    return envHash;
  }
  
  // 最后使用默认值
  if (validatePasswordHashFormat(DEFAULT_ADMIN_PASSWORD_HASH)) {
    // 将默认哈希保存到数据库
    adminSettings.set('admin_password_hash', DEFAULT_ADMIN_PASSWORD_HASH);
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
    console.log('✅ 管理员密码哈希已初始化');
  } else {
    console.warn('⚠️ 密码哈希格式无效，使用默认哈希');
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
      console.log(`🌱 Seeded sample data: ${resourcesCount} resources, ${filtersCount} filters`);
    }
  } catch (e) {
    console.warn('Seed sample data failed:', e?.message || e);
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

    if (!token || !tokens.verify(token)) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }
    next();
  } catch (error) {
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
    console.log('新的密码哈希已生成（请将其设置为环境变量 ADMIN_PASSWORD_HASH）:');
    console.log(newHash);

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
      console.log('✅ 管理员密码已更新');
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
    const { durationInDays = 30, username = 'Anonymous' } = req.body;

    if (durationInDays && (typeof durationInDays !== 'number' || durationInDays < 1 || durationInDays > 365)) {
      return res.status(400).json({ success: false, message: '有效期必须在1-365天之间' });
    }

    const code = crypto.randomBytes(16).toString('hex').toUpperCase();
    const newKey = accessKeys.add(code, username || 'Anonymous', durationInDays || 30, 'user');

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
    
    // 检查访问密钥是否已被其他 IP 使用（单 IP 限制）
    if (tokens.isAccessKeyInUse(key.code, clientIp)) {
      return res.status(403).json({ 
        success: false, 
        message: '此访问密钥已在其他设备上使用，同一密钥只能在一台设备上登录' 
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

    console.log(`Starlight access granted: Key ${key.code} for IP ${clientIp}`);

    res.json({
      success: true,
      message: 'Access Granted',
      token: accessToken,
      keyInfo: {
        code: key.code,
        username: key.username,
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
      
      if (!token || !tokens.isAdmin(token)) {
        return res.status(403).json({ 
          success: false, 
          message: '此分类仅管理员可访问',
          filters: [],
          resources: []
        });
      }
    }
    
    const categoryResources = resources.getByCategory(category);
    const categoryFilters = filters.getByCategory(category);
    
    res.json({
      filters: categoryFilters,
      resources: categoryResources
    });
  } catch (error) {
    next(error);
  }
});

// Get all resources
app.get('/api/resources', (req, res, next) => {
  try {
    const allResources = resources.getAll();
    const allFilters = filters.getAll();
    
    res.json({
      filters: allFilters,
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
        const validCategories = ['AiCC', 'UXLib', 'Learning', 'Starlight Academy'];
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
        console.error(`批量保存第 ${index + 1} 条资源时出错:`, error);
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
    const deleted = resources.delete(id);
    
    if (deleted) {
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
    const deleted = filters.delete(category, tag);
    
    if (deleted) {
      res.json({ success: true, message: 'Filter deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Filter not found' });
    }
  } catch (error) {
    next(error);
  }
});

// ==================== Image Upload Routes ====================

// Upload image (Admin Only)
app.post('/api/upload/image', requireAuth, upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

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
    next(error);
  }
});

// Serve uploaded images
app.use('/data/uploads', express.static(UPLOAD_DIR));

// ==================== Health Check ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    database: 'sqlite',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

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
      console.error('Proxy error:', err.message);
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

// Start Server
const startServer = async () => {
  await initializePasswordHash();
  seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Data files served from /data`);
    console.log(`💾 Using SQLite database`);
    
    if (HAS_FRONTEND_DIST) {
      console.log(`📦 Production mode - serving static files from ${FRONTEND_DIST_PATH}`);
    } else if (IS_DEV) {
      console.log(`🔧 Development mode - proxying to Next.js at http://localhost:${FRONTEND_DEV_PORT}`);
      console.log(`   Start frontend first: cd frontend && npm run dev`);
    } else {
      console.log(`⚠️  No frontend build found. Run 'npm run build' in frontend/`);
    }
  });
};

startServer();
