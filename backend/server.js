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

// Import database operations
const { tokens, accessKeys, resources, filters } = require('./db');

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

// 404 处理
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API 端点不存在'
  });
});

// Serve static data files
app.use('/data', express.static(path.join(__dirname, 'data')));

// 密码配置 - 使用环境变量或默认哈希值
// 默认密码哈希对应明文密码: 'admin123' (请在生产环境中修改)
const DEFAULT_ADMIN_PASSWORD_HASH = '$2b$10$fqSNTFsk5LB9SxUC0qr5.uW9mv/Ty89y.RvUJ4lcHcbyCvV2Zp01W';

// 获取管理员密码哈希 - 优先使用环境变量
let ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH;

// 验证密码哈希格式是否有效（不验证具体密码，只检查格式）
const validatePasswordHashFormat = (hash) => {
  // bcrypt 哈希格式: $2a$, $2b$, or $2y$ 开头，长度约60字符
  return hash && typeof hash === 'string' && hash.startsWith('$2') && hash.length >= 59;
};

// 在启动时验证密码哈希格式
const initializePasswordHash = async () => {
  if (!validatePasswordHashFormat(ADMIN_PASSWORD_HASH)) {
    console.warn('当前密码哈希格式无效，使用默认哈希');
    ADMIN_PASSWORD_HASH = DEFAULT_ADMIN_PASSWORD_HASH;
  } else {
    console.log('✅ 使用环境变量中的密码哈希');
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

// ==================== Auth Routes ====================

// Login Endpoint
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: '密码不能为空' });
    }

    const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (isValidPassword) {
      const token = generateToken();
      const stored = tokens.add(token, 'admin');
      
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

// Generate new password hash (Admin Only)
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

// ==================== Access Keys Routes ====================

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

// Generate Access Key (Admin Only)
app.post('/api/keys/generate', requireAuth, (req, res, next) => {
  try {
    const { durationInDays = 30, username = 'Anonymous' } = req.body;

    if (durationInDays && (typeof durationInDays !== 'number' || durationInDays < 1 || durationInDays > 365)) {
      return res.status(400).json({ success: false, message: '有效期必须在1-365天之间' });
    }

    const code = crypto.randomBytes(16).toString('hex').toUpperCase();
    const newKey = accessKeys.add(code, username || 'Anonymous', durationInDays || 30);

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

    const accessToken = generateToken();
    tokens.add(accessToken, 'starlight');

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
