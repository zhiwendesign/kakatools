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
│   └── public/            # 静态资源
│
├── backend/               # Express 后端服务
│   ├── server.js          # 主服务器
│   ├── db.js              # SQLite 数据库模块
│   ├── import-data.js     # 数据导入脚本
│   └── data/              # 数据库文件
│       └── kktools.db     # SQLite 数据库
│
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
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

#### 前端配置（可选）

前端默认连接 `http://localhost:4200`，如需更改，创建 `frontend/.env.local`：

```env
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:4200
```

### 3. 初始化数据（首次运行）

```bash
cd backend
node import-data.js
```

### 4. 启动服务

**方式一：分别启动**

```bash
# 终端1 - 启动后端（端口 4200）
cd backend
npm start

# 终端2 - 启动前端（端口 3000）
cd frontend
npm run dev
```

**方式二：使用 PM2（推荐生产环境）**

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd backend
pm2 start server.js --name kktools-api

# 启动前端
cd ../frontend
npm run build
pm2 start npm --name kktools-web -- start
```

### 5. 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:4200
- **配置管理**: http://localhost:3000/config

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
- 📚 **Learning** - 学习资料（需管理员登录）
- ⭐ **Starlight Academy** - 付费内容专区（需访问密钥或管理员权限）

### 后台功能（需管理员登录）

- 📝 **资源管理** - 添加、编辑、删除资源卡片
- 🏷️ **标签管理** - 管理各分类的过滤标签
- 🔑 **密钥管理** - 生成和管理 Starlight 访问密钥
- ⚙️ **头部配置** - 自定义 Logo、标题、联系图片

### 权限说明

| 用户类型 | AiCC | UXLib | Learning | Starlight |
|---------|------|-------|----------|-----------|
| 游客 | ✅ | ✅ | ❌ | ❌ |
| Starlight Key | ✅ | ✅ | ❌ | ✅ |
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

### Nginx 反向代理示例

```nginx
# 前端
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 后端 API（同域名不同路径）
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 环境变量（生产）

```env
# backend/.env
PORT=4200
FRONTEND_URL=https://your-domain.com
ADMIN_PASSWORD_HASH=your-secure-hash

# frontend/.env.local
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

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
