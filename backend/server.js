const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcrypt');

// Import database operations
const { tokens, accessKeys, resources, filters } = require('./db');

const app = express();
const PORT = process.env.PORT || 4200;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());

// Serve static data files
app.use('/data', express.static(path.join(__dirname, 'data')));

// 密码配置 - 使用环境变量或默认哈希值
// 默认密码哈希对应明文密码: 'admin123' (请在生产环境中修改)
const DEFAULT_ADMIN_PASSWORD_HASH = '$2b$10$fqSNTFsk5LB9SxUC0qr5.uW9mv/Ty89y.RvUJ4lcHcbyCvV2Zp01W';

// 获取管理员密码哈希 - 优先使用环境变量
let ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH;

// 验证密码哈希是否有效的函数
const validatePasswordHash = async (hash) => {
  try {
    return await bcrypt.compare('admin123', hash);
  } catch (error) {
    console.warn('无效的密码哈希，使用默认哈希');
    return false;
  }
};

// 在启动时验证密码哈希
const initializePasswordHash = async () => {
  const isValid = await validatePasswordHash(ADMIN_PASSWORD_HASH);
  if (!isValid) {
    console.warn('当前密码哈希无效，生成新的默认哈希');
    try {
      ADMIN_PASSWORD_HASH = await bcrypt.hash('admin123', 10);
      console.log('已生成新的默认密码哈希');
    } catch (error) {
      console.error('密码哈希生成失败:', error);
      ADMIN_PASSWORD_HASH = DEFAULT_ADMIN_PASSWORD_HASH;
    }
  }
};

// Generate a simple random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// ==================== Auth Routes ====================

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: '密码不能为空' });
  }

  try {
    const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (isValidPassword) {
      const token = generateToken();
      // Store token in SQLite
      tokens.add(token, 'admin');
      console.log(`Login successful. Token generated: ${token.substring(0, 8)}...`);
      res.json({ success: true, token });
    } else {
      console.log('Login failed: Incorrect password');
      res.status(401).json({ success: false, message: '密码错误' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Verify Token Endpoint
app.post('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && tokens.verify(token)) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    tokens.delete(token);
  }
  res.json({ success: true });
});

// Generate new password hash (Admin Only)
app.post('/api/auth/generate-password-hash', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !tokens.verify(token)) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
  }

  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: '新密码长度至少6位'
    });
  }

  try {
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
    console.error('Password hash generation error:', error);
    res.status(500).json({ success: false, message: '密码哈希生成失败' });
  }
});

// ==================== Access Keys Routes ====================

// Auth middleware for admin routes
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !tokens.verify(token)) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
  }
  next();
};

// Generate Access Key (Admin Only)
app.post('/api/keys/generate', requireAuth, (req, res) => {
  const { durationInDays = 30, username = 'Anonymous' } = req.body;

  const code = crypto.randomBytes(16).toString('hex').toUpperCase();
  
  // Store in SQLite
  const newKey = accessKeys.add(code, username, durationInDays);

  if (newKey) {
    console.log(`Generated Key: ${code} for ${username} (Expires in ${durationInDays} days)`);
    res.json({ success: true, key: newKey });
  } else {
    res.status(500).json({ success: false, message: 'Failed to generate key' });
  }
});

// Verify Access Key (Public)
app.post('/api/keys/verify', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Key is required' });
  }

  const key = accessKeys.findByCode(code);

  if (!key) {
    return res.status(401).json({ success: false, message: 'Invalid Access Key' });
  }

  if (accessKeys.isExpired(key)) {
    accessKeys.delete(code);
    return res.status(401).json({ success: false, message: 'Access Key has expired' });
  }

  // Generate access token and store in SQLite
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
});

// List Access Keys (Admin Only)
app.get('/api/keys', requireAuth, (req, res) => {
  const keys = accessKeys.getAll();
  res.json({ success: true, keys });
});

// Revoke Access Key (Admin Only)
app.delete('/api/keys/:code', requireAuth, (req, res) => {
  const { code } = req.params;
  const deleted = accessKeys.delete(code);

  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Key not found' });
  }

  res.json({ success: true, message: 'Key revoked' });
});

// Rename Access Key (Admin Only)
app.put('/api/keys/:code', requireAuth, (req, res) => {
  const { code } = req.params;
  const { name } = req.body;

  const key = accessKeys.updateName(code, name);
  
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
});

// ==================== Resources Routes ====================

// Get resources by category
app.get('/api/resources/:category', (req, res) => {
  const { category } = req.params;
  const categoryResources = resources.getByCategory(category);
  const categoryFilters = filters.getByCategory(category);
  
  res.json({
    filters: categoryFilters,
    resources: categoryResources
  });
});

// Get all resources
app.get('/api/resources', (req, res) => {
  const allResources = resources.getAll();
  const allFilters = filters.getAll();
  
  res.json({
    filters: allFilters,
    resources: allResources
  });
});

// Add/Update resource (Admin Only)
app.post('/api/resources', requireAuth, (req, res) => {
  const resource = req.body;
  
  if (!resource.id || !resource.title || !resource.category) {
    return res.status(400).json({ success: false, message: 'Missing required fields: id, title, category' });
  }
  
  const success = resources.upsert(resource);
  
  if (success) {
    res.json({ success: true, resource: resources.getById(resource.id) });
  } else {
    res.status(500).json({ success: false, message: 'Failed to save resource' });
  }
});

// Delete resource (Admin Only)
app.delete('/api/resources/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const deleted = resources.delete(id);
  
  if (deleted) {
    res.json({ success: true, message: 'Resource deleted' });
  } else {
    res.status(404).json({ success: false, message: 'Resource not found' });
  }
});

// ==================== Filters Routes ====================

// Get filters by category
app.get('/api/filters/:category', (req, res) => {
  const { category } = req.params;
  const categoryFilters = filters.getByCategory(category);
  res.json({ filters: categoryFilters });
});

// Add filter (Admin Only)
app.post('/api/filters', requireAuth, (req, res) => {
  const { category, label, tag } = req.body;
  
  if (!category || !label || !tag) {
    return res.status(400).json({ success: false, message: 'Missing required fields: category, label, tag' });
  }
  
  const success = filters.upsert(category, label, tag);
  
  if (success) {
    res.json({ success: true, filters: filters.getByCategory(category) });
  } else {
    res.status(500).json({ success: false, message: 'Failed to save filter' });
  }
});

// Delete filter (Admin Only)
app.delete('/api/filters/:category/:tag', requireAuth, (req, res) => {
  const { category, tag } = req.params;
  const deleted = filters.delete(category, tag);
  
  if (deleted) {
    res.json({ success: true, message: 'Filter deleted' });
  } else {
    res.status(404).json({ success: false, message: 'Filter not found' });
  }
});

// ==================== Health Check ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'sqlite' });
});

// Start Server
const startServer = async () => {
  await initializePasswordHash();
  app.listen(PORT, () => {
    console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
    console.log(`📁 Data files served from /data`);
    console.log(`💾 Using SQLite database for persistent storage`);
  });
};

startServer();
