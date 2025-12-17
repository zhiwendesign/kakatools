# 密码安全配置指南

## 🔒 密码安全改进说明

### 问题背景
之前的管理员密码 `zhiwen@987` 以明文形式硬编码在代码中，存在严重的安全风险：
- 前端代码中可直接看到密码
- 代码泄露会导致密码暴露
- 无法安全地修改密码

### 解决方案
现已实现完整的密码加密和安全管理方案：

## ✅ 已实现的安全功能

### 1. 密码哈希加密
- 使用 bcrypt 算法对密码进行哈希加密
- 盐值轮换 (salt rounds: 10)
- 永远不在代码中存储明文密码

### 2. 环境变量管理
- 创建 `.env` 文件管理敏感信息
- 提供 `.env.example` 作为配置模板
- 支持通过环境变量 `ADMIN_PASSWORD_HASH` 配置密码

### 3. 安全的密码修改
- 添加 `/api/auth/generate-password-hash` 端点
- 已认证管理员可以生成新的密码哈希
- 提供详细的配置说明

## 🔧 使用说明

### 默认登录信息
- **用户名**: 无需用户名
- **密码**: `zhiwen@987`
- **说明**: 请在生产环境中立即修改！

### 修改密码步骤

#### 方法1: 使用内置工具 (推荐)
1. 登录管理界面 (使用当前密码)
2. 在浏览器控制台执行：
```javascript
fetch('/api/auth/generate-password-hash', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
    },
    body: JSON.stringify({ newPassword: 'your_new_password' })
})
```
3. 复制生成的哈希值到 `.env` 文件

#### 方法2: 手动生成哈希
```bash
node -e "require('bcrypt').hash('your_password', 10).then(console.log)"
```

#### 方法3: 设置环境变量
```bash
export ADMIN_PASSWORD_HASH='your_generated_hash'
```

### 环境变量配置
复制 `.env.example` 为 `.env` 并修改：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 管理员密码哈希
ADMIN_PASSWORD_HASH=your_generated_hash_here

# 服务器端口
PORT=3000
```

## 🛡️ 安全最佳实践

### 生产环境部署
1. **立即修改默认密码** (`admin123`)
2. **使用强密码** (至少8位，包含大小写字母、数字、特殊字符)
3. **保护环境变量文件** (`.env` 不应提交到版本控制)
4. **定期更换密码**
5. **启用 HTTPS** (生产环境)

### 代码安全
- 永远不要在代码中硬编码密码
- 使用环境变量管理所有敏感信息
- 定期更新依赖包 (特别是安全相关)
- 启用访问日志监控

### 访问控制
- 管理员密码仅用于后端API认证
- 前端不存储密码，仅临时用于登录
- JWT token 有时效性
- 支持安全的登出功能

## 🔍 API 端点

### 认证相关
- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/verify` - 验证token
- `POST /api/auth/logout` - 登出
- `POST /api/auth/generate-password-hash` - 生成新密码哈希 (需要认证)

### 测试命令
```bash
# 正确密码测试
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'

# 错误密码测试
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"wrongpassword"}'
```

## 🚨 安全警告
- **默认密码过于简单，请立即修改！**
- **不要在生产环境中使用默认密码**
- **定期检查和更新密码**
- **监控异常登录尝试**

---

**最后更新**: 2024年密码安全升级
**版本**: v2.0 - 加密版本