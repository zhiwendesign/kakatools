const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// 密码配置 - 使用环境变量或默认哈希值
// 默认密码哈希对应明文密码: 'admin123' (请在生产环境中修改)
const DEFAULT_ADMIN_PASSWORD_HASH = '$2b$10$fqSNTFsk5LB9SxUC0qr5.uW9mv/Ty89y.RvUJ4lcHcbyCvV2Zp01W'; // 对应 'admin123'

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

// Simple in-memory token store (for demo purposes)
const validTokens = new Set();
// Simple in-memory Access Keys store for Starlight Academy
// Key format: { code: string, createdAt: number, expiresAt: number, duration: number }
let accessKeys = [];

// Generate a simple random token
const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

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
            validTokens.add(token);
            console.log(`Login successful. Token generated: ${token}`);
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
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token && validTokens.has(token)) {
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
        validTokens.delete(token);
    }
    res.json({ success: true });
});

// --- Starlight Academy Access Keys API ---

// Generate Access Key (Admin Only)
app.post('/api/keys/generate', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !validTokens.has(token)) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }

    const { durationInDays = 30, username = 'Anonymous' } = req.body;

    // Generate 32-char random hex string (16 bytes)
    const code = crypto.randomBytes(16).toString('hex').toUpperCase();

    const now = Date.now();
    const expiresAt = now + (durationInDays * 24 * 60 * 60 * 1000);

    const newKey = {
        code,
        username,
        createdAt: now,
        expiresAt,
        duration: durationInDays
    };

    accessKeys.push(newKey);
    console.log(`Generated Key: ${code} for ${username} (Expires in ${durationInDays} days)`);

    res.json({ success: true, key: newKey });
});

// Verify Access Key (Public)
app.post('/api/keys/verify', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, message: 'Key is required' });
    }

    const keyIndex = accessKeys.findIndex(k => k.code === code.trim().toUpperCase());

    if (keyIndex === -1) {
        return res.status(401).json({ success: false, message: 'Invalid Access Key' });
    }

    const key = accessKeys[keyIndex];

    if (Date.now() > key.expiresAt) {
        // Automatically remove expired keys
        accessKeys.splice(keyIndex, 1);
        return res.status(401).json({ success: false, message: 'Access Key has expired' });
    }

    // Generate access token and return with key info
    const accessToken = generateToken();
    validTokens.add(accessToken);

    res.json({ 
        success: true, 
        message: 'Access Granted',
        token: accessToken,
        keyInfo: {
            code: key.code,
            username: key.username,
            createdAt: key.createdAt,
            expiresAt: key.expiresAt,
            duration: key.duration
        }
    });
});

// List Access Keys (Admin Only)
app.get('/api/keys', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !validTokens.has(token)) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }

    // Clean up expired keys before sending
    const now = Date.now();
    accessKeys = accessKeys.filter(k => k.expiresAt > now);

    res.json({ success: true, keys: accessKeys });
});

// Revoke Access Key (Admin Only)
app.delete('/api/keys/:code', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !validTokens.has(token)) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }

    const { code } = req.params;
    const initialLength = accessKeys.length;
    accessKeys = accessKeys.filter(k => k.code !== code);

    if (accessKeys.length === initialLength) {
        return res.status(404).json({ success: false, message: 'Key not found' });
    }

    res.json({ success: true, message: 'Key revoked' });
});

// Rename Access Key (Admin Only)
app.put('/api/keys/:code', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !validTokens.has(token)) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Admin access required' });
    }

    const { code } = req.params;
    const { name } = req.body;

    const key = accessKeys.find(k => k.code === code);
    if (!key) {
        return res.status(404).json({ success: false, message: 'Key not found' });
    }

    key.name = name;
    res.json({ success: true, message: 'Key renamed', key });
});

// 生成新密码哈希 (Admin Only) - 安全的密码修改方式
app.post('/api/auth/generate-password-hash', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !validTokens.has(token)) {
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
        
        // 注意：在生产环境中，应该将此哈希保存到环境变量或数据库
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

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
