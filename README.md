# KKTools - 卡卡资源库

AI工具、设计资源、学习资料一站式导航平台。

## 📁 项目结构

```
kktools/
├── frontend/              # Next.js 前端应用
│   ├── src/
│   │   ├── app/           # 页面路由
│   │   │   ├── page.tsx   # 首页
│   │   │   └── config/    # 配置管理页面
│   │   ├── components/    # React 组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── lib/           # API 和工具函数
│   │   ├── types/         # TypeScript 类型
│   │   └── constants/     # 常量配置
│   ├── public/            # 静态资源
│   ├── out/               # 构建输出（生产部署用）
│   ├── .env.development   # 开发环境配置
│   └── .env.production    # 生产环境配置
│
├── backend/               # Express 后端服务
│   ├── server.js          # 主服务器（含静态文件服务）
│   ├── db.js              # SQLite 数据库模块
│   ├── import-data.js     # 数据导入脚本
│   └── data/              # 数据库文件
│       └── kktools.db     # SQLite 数据库
│
├── ecosystem.config.js    # PM2 配置文件
├── package.json           # 根目录脚本
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 方式一：使用根目录脚本
npm run install:all

# 方式二：分别安装
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量

#### 后端配置

复制示例配置文件并修改：

```bash
cd backend
cp env.example .env
```

配置项说明（`backend/.env`）：

```env
# 服务器端口
PORT=4200

# 前端地址（用于 CORS）
FRONTEND_URL=http://localhost:3000

# 管理员密码哈希（默认密码: admin123）
ADMIN_PASSWORD_HASH=$2b$10$fqSNTFsk5LB9SxUC0qr5.uW9mv/Ty89y.RvUJ4lcHcbyCvV2Zp01W

# 数据库路径（可选，默认 ./data/kktools.db）
# DB_PATH=./data/kktools.db
```

#### 前端配置

前端已预置环境变量文件：

- `.env.development` - 开发环境（默认 `http://localhost:4200`）
- `.env.production` - 生产环境（默认 `https://k.uxlib.cn`）

**修改配置：**

```bash
cd frontend

# 开发环境 - 直接编辑 .env.development
# 生产环境 - 编辑 .env.production 或创建 .env.production.local 覆盖
```

```env
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:4200
```

> 💡 提示：`.env.local` 和 `.env.*.local` 文件不会被提交到 Git，适合存放敏感配置

### 3. 初始化数据（首次运行）

```bash
cd backend
node import-data.js
```

### 4. 启动服务

#### 开发模式（统一端口 4200）

```bash
# 方式一：一键启动（推荐）
npm run dev
# 同时启动前端和后端，通过 4200 端口访问

# 方式二：分别启动
# 终端1 - 启动前端开发服务器
npm run dev:frontend

# 终端2 - 启动后端（代理前端）
npm run dev:backend
```

- **统一访问**: http://localhost:4200
- **后端会自动代理前端请求，支持热更新**

#### 生产模式（统一部署，推荐）

```bash
# 1. 构建前端静态文件
npm run build
# 输出到 frontend/out/

# 2. 启动服务（前后端统一）
npm start
# 或使用 PM2
pm2 start ecosystem.config.js
```

- **统一访问**: http://localhost:4200
- **配置管理**: http://localhost:4200/config/

### 5. PM2 部署（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 构建并启动
npm run build
pm2 start ecosystem.config.js

# 常用命令
pm2 status          # 查看状态
pm2 logs kktools    # 查看日志
pm2 restart kktools # 重启服务
pm2 stop kktools    # 停止服务
```

## 🔐 管理员登录

### 默认密码

- **密码**: `admin123`

### 修改管理员密码

1. 登录管理后台
2. 或使用 API 生成新密码哈希：

```bash
# 调用 API 生成新密码哈希
curl -X POST http://localhost:4200/api/auth/generate-password-hash \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"newPassword": "your-new-password"}'
```

3. 将返回的哈希值更新到 `backend/.env` 的 `ADMIN_PASSWORD_HASH`
4. 重启后端服务

## ✨ 功能特性

### 前台功能

- 🤖 **AiCC** - AI 工具集合（ChatGPT、Claude、Midjourney 等）
- 🎨 **UXLib** - UI/UX 设计资源
- 📚 **Learning** - 学习资料（公开访问）
- ⭐ **Starlight Academy** - 付费内容专区（需访问密钥或管理员权限）

### 后台功能（需管理员登录）

- 📝 **资源管理** - 添加、编辑、删除资源卡片
- 🏷️ **标签管理** - 管理各分类的过滤标签
- 🔑 **密钥管理** - 生成和管理 Starlight 访问密钥
- ⚙️ **头部配置** - 自定义 Logo、标题、联系图片

### 权限说明

| 用户类型 | AiCC | UXLib | Learning | Starlight |
|---------|------|-------|----------|-----------|
| 游客 | ✅ | ✅ | ✅ | ❌ |
| Starlight Key | ✅ | ✅ | ✅ | ✅ |
| 管理员 | ✅ | ✅ | ✅ | ✅ |

## 🔧 API 端点

### 认证

- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/verify` - 验证 Token
- `POST /api/auth/logout` - 退出登录

### 资源

- `GET /api/resources/:category` - 获取分类资源
- `POST /api/resources` - 添加/更新资源（需认证）
- `DELETE /api/resources/:id` - 删除资源（需认证）

### 过滤器

- `GET /api/filters/:category` - 获取分类过滤器
- `POST /api/filters` - 添加过滤器（需认证）
- `DELETE /api/filters/:category/:tag` - 删除过滤器（需认证）

### 访问密钥

- `POST /api/keys/verify` - 验证访问密钥
- `GET /api/keys` - 获取所有密钥（需认证）
- `POST /api/keys/generate` - 生成新密钥（需认证）
- `DELETE /api/keys/:code` - 撤销密钥（需认证）

## 🗄️ 数据库

使用 **better-sqlite3** 存储数据：

- `tokens` - 登录 Token
- `access_keys` - Starlight 访问密钥
- `resources` - 资源数据
- `filters` - 过滤标签

数据库文件位于 `backend/data/kktools.db`

## 🌐 生产部署

### 统一部署模式（推荐）

统一部署只需要一个端口，前后端在同一服务中：

```bash
# 1. 构建前端
cd frontend && npm run build

# 2. 启动服务
cd .. && pm2 start ecosystem.config.js
```

### Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 环境变量（生产）

```env
# backend/.env
PORT=4200
ADMIN_PASSWORD_HASH=your-secure-hash
# FRONTEND_URL 在统一部署模式下不需要
```

> 💡 **统一部署优势**：
> - 只需要一个端口、一个域名
> - 无跨域问题，无需配置 CORS
> - 简化部署和维护

## 🛠️ 技术栈

### 前端
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Lucide React Icons

### 后端
- Node.js + Express
- better-sqlite3
- bcrypt (密码加密)

## 📄 License

MIT
