# KKTools - 卡卡资源库

AI工具、设计资源、学习资料一站式平台

## 项目结构

```
kktools/
├── frontend/          # Next.js 前端应用
│   ├── src/
│   │   ├── app/       # Next.js App Router 页面
│   │   ├── components/# React 组件
│   │   ├── hooks/     # 自定义 React Hooks
│   │   ├── lib/       # 工具函数和 API
│   │   ├── types/     # TypeScript 类型定义
│   │   └── constants/ # 常量配置
│   └── public/        # 静态资源
│
├── backend/           # Express 后端服务
│   ├── server.js      # 主服务器文件
│   ├── data/          # JSON 数据文件
│   └── .env           # 环境变量配置
│
└── README.md
```

## 快速开始

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

**后端配置** (`backend/.env`):
```env
PORT=4200
FRONTEND_URL=http://localhost:3000
ADMIN_PASSWORD_HASH=$2b$10$fqSNTFsk5LB9SxUC0qr5.uW9mv/Ty89y.RvUJ4lcHcbyCvV2Zp01W

# 数据库路径 (可选，默认为 backend/data/kktools.db)
DB_PATH=./data/kktools.db
```

**前端配置** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4200
```

### 3. 启动服务

**启动后端** (端口 4200):
```bash
cd backend
npm start
```

**启动前端** (端口 3000):
```bash
cd frontend
npm run dev
```

访问 http://localhost:3000 查看应用

## 功能特性

- 🤖 **AI工具集合** - ChatGPT、Midjourney、Claude 等
- 🎨 **设计资源** - Figma、Canva、Framer 等
- 📚 **学习资料** - 编程教程、课程资源
- ⭐ **Starlight Academy** - 付费内容专区
- 🔐 **管理员后台** - 资源管理、密钥管理
- 💾 **SQLite 数据持久化** - Token 和访问密钥持久化存储

## 技术栈

### 前端
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (图标)

### 后端
- Node.js
- Express
- better-sqlite3 (SQLite 数据库)
- bcrypt (密码加密)
- cors

## 默认登录

- **管理员密码**: `admin123`

## 生产部署

### 前端部署

```bash
cd frontend
npm run build
npm start
```

### 后端部署

推荐使用 PM2 管理进程：

```bash
cd backend
pm2 start server.js --name kktools-backend
```

### 反向代理配置 (Nginx)

```nginx
# 前端
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 后端 API
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:4200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## License

MIT
