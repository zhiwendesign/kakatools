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
│   │   │   ├── cards/     # 资源卡片组件
│   │   │   ├── config/    # 配置管理组件
│   │   │   │   └── MarkdownEditor.tsx  # Markdown 编辑器
│   │   │   ├── modals/    # 弹窗组件
│   │   │   │   └── DocumentModal.tsx   # 文档展示弹窗
│   │   │   ├── layout/    # 布局组件
│   │   │   └── ui/        # UI 基础组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── lib/           # API 和工具函数
│   │   ├── types/         # TypeScript 类型
│   │   └── constants/     # 常量配置
│   ├── public/            # 静态资源
│   ├── out/               # 构建输出（生产部署用）
│   └── next.config.js     # Next.js 配置
│
├── backend/               # Express 后端服务
│   ├── server.js         # 主服务器（含静态文件服务）
│   ├── db.js             # SQLite 数据库模块
│   ├── import-data.js    # 数据导入脚本
│   ├── .env              # 环境变量配置
│   └── data/             # 数据库文件
│       └── kktools.db    # SQLite 数据库
│
├── ecosystem.config.js   # PM2 配置文件
├── package.json          # 根目录脚本
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 方式一：使用根目录脚本（推荐）
npm run install:all

# 方式二：分别安装
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量

#### 后端配置

创建并编辑 `backend/.env`：

```bash
cd backend
cp env.example .env
# 编辑 .env 文件
```

配置项说明（`backend/.env`）：

```env
# 服务器端口
PORT=4200

# 管理员密码哈希（使用 bcrypt 加密）
# 默认密码: zhiwen@987
ADMIN_PASSWORD_HASH=$2b$10$PXIeBechPrXGat12GAjJI.UQiXzJrjFjYxcfuKw.Whd/KsBABsLGW

# 数据库路径（可选，默认 ./data/kktools.db）
# DB_PATH=./data/kktools.db
```

**生成新密码哈希：**

```bash
cd backend
node generate-hash.js your-password
# 将输出的哈希值复制到 .env 的 ADMIN_PASSWORD_HASH
```

#### 前端配置

前端已预置环境变量，通常无需修改：

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
pm2 logs kktools     # 查看日志
pm2 restart kktools # 重启服务
pm2 stop kktools    # 停止服务
```

## 🔐 管理员登录

### 默认密码

- **密码**: `zhiwen@987`

### 修改管理员密码

1. 生成新密码哈希：
   ```bash
   cd backend
   node generate-hash.js your-new-password
   ```

2. 将输出的哈希值更新到 `backend/.env` 的 `ADMIN_PASSWORD_HASH`

3. 重启后端服务

## ✨ 功能特性

### 前台功能

- 🤖 **AiCC** - AI 工具集合
  - 副标题：探索AI绘画模型和ComfyUI资料集合丨欢迎合作交流微信🛰️XingYueAIArt
  
- 🎨 **UXLib** - UI/UX 设计资源
  - 副标题：跟我学习更多UI/UX知识丨欢迎合作交流微信🛰️XingYueAIArt
  
- 📚 **Learning** - 学习资料（管理员专属）
  - 副标题：学习资源与教程集合丨欢迎合作交流微信🛰️XingYueAIArt
  
- ⭐ **Starlight Academy** - 付费内容专区
  - 副标题：愿大家像星星一样散发着光芒，有无限可能
  - 需要访问密钥或管理员权限

### 后台功能（需管理员登录）

- 📝 **资源管理** - 添加、编辑、删除资源卡片
  - 支持链接类型：填写 URL 进行跳转
  - 支持文档类型：直接编写 Markdown 文档，点击卡片弹窗展示
  
- 🏷️ **菜单管理** - 管理各分类的过滤菜单（原标签管理）
  - 为每个分类配置过滤菜单项
  - 支持菜单的显示名称和值
  
- 🔑 **密钥管理** - 生成和管理 Starlight 访问密钥
  - 设置密钥有效期
  - 查看所有密钥和使用情况
  
- ⚙️ **头部配置** - 自定义 Logo、标题、联系图片
  - 上传头像图片
  - 自定义标题文字
  - 配置合作交流图片

### 文档功能（新增）

- 📄 **Markdown 编辑器**
  - 工具栏快捷按钮（标题、粗体、斜体、链接、代码、列表、引用、图片）
  - 快捷键支持（Ctrl+B、Ctrl+I、Ctrl+K 等）
  - 实时字符计数
  - 语法帮助提示
  
- 🖼️ **文档展示**
  - 弹窗展示完整文档内容
  - 支持 Markdown 语法渲染（标题、粗体、斜体、代码、链接、列表、引用、表格、分割线）
  - 图片点击放大查看
  - 响应式设计，支持滚动查看
  
- 🔒 **内容保护**
  - 禁止复制文本
  - 禁止右键菜单
  - 禁止拖拽图片
  - 禁止文本选择

### 交互优化

- 🏠 **Logo 点击返回**
  - 点击头部 Logo/标题自动返回 AiCC 分类
  - 从配置页面点击 Logo 跳转到首页并切换到 AiCC
  
- 🔄 **数据同步**
  - 添加/删除/编辑资源后自动刷新
  - 跨页面数据同步
  - 认证状态变化时自动更新数据

### 权限说明

| 用户类型 | AiCC | UXLib | Learning | Starlight |
|---------|------|-------|----------|-----------|
| 游客 | ✅ | ✅ | ❌ | ❌ |
| Starlight Key | ✅ | ✅ | ❌ | ✅ |
| 管理员 | ✅ | ✅ | ✅ | ✅ |

## 📝 Markdown 支持

### 支持的语法

- **标题**: `# H1` 到 `###### H6`
- **文本格式**: `**粗体**`、`*斜体*`
- **代码**: `` `行内代码` ``、` ```代码块``` ``
- **链接**: `[文本](URL)`
- **图片**: `![描述](图片URL)` - 点击可放大查看
- **列表**: `- 无序列表`、`1. 有序列表`
- **引用**: `> 引用内容`
- **表格**: Markdown 表格语法
- **分割线**: `---` 或 `***`

### 编辑器功能

- 工具栏快捷按钮
- 快捷键支持
- 实时字符计数
- 语法帮助提示

## 🔧 API 端点

### 认证

- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/verify` - 验证 Token
- `POST /api/auth/logout` - 退出登录

### 资源

- `GET /api/resources/:category` - 获取分类资源
- `GET /api/resources` - 获取所有资源
- `POST /api/resources` - 添加/更新资源（需认证）
- `DELETE /api/resources/:id` - 删除资源（需认证）

### 过滤器（菜单）

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

- `tokens` - 登录 Token（管理员和 Starlight 访问）
- `access_keys` - Starlight 访问密钥
- `resources` - 资源数据
  - `content_type` - 资源类型（'link' 或 'document'）
  - `content` - 文档内容（当 content_type 为 'document' 时）
- `filters` - 过滤菜单

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
NODE_ENV=production
```

> 💡 **统一部署优势**：
> - 只需要一个端口、一个域名
> - 无跨域问题，无需配置 CORS
> - 简化部署和维护

## 🛠️ 技术栈

### 前端
- Next.js 14 (App Router, Static Export)
- React 18 + TypeScript
- Tailwind CSS
- Lucide React Icons

### 后端
- Node.js + Express
- better-sqlite3 (SQLite 数据库)
- bcrypt (密码加密)
- dotenv (环境变量管理)

## 📦 项目特点

- ✅ **全栈应用** - Next.js 前端 + Express 后端
- ✅ **统一部署** - 前后端同一端口，简化部署
- ✅ **静态导出** - 前端可静态部署
- ✅ **SQLite 数据库** - 轻量级，无需额外数据库服务
- ✅ **Markdown 文档** - 支持富文本文档展示
- ✅ **内容保护** - 文档查看时禁止复制
- ✅ **权限控制** - 管理员和访问密钥双重权限
- ✅ **响应式设计** - 适配各种设备

## 🎯 使用示例

### 创建链接类型资源

1. 登录管理后台
2. 点击"新增卡片"
3. 选择分类和内容类型为"跳转链接"
4. 填写标题、描述、链接 URL
5. 上传图片
6. 选择菜单标签
7. 保存

### 创建文档类型资源

1. 登录管理后台
2. 点击"新增卡片"
3. 选择分类和内容类型为"文档内容"
4. 填写标题、描述
5. 使用 Markdown 编辑器编写文档内容
   - 使用工具栏按钮快速插入格式
   - 或使用快捷键（Ctrl+B、Ctrl+I 等）
6. 上传封面图片
7. 选择菜单标签
8. 保存

### 查看文档

1. 在首页找到文档类型的卡片（右上角有"文档"标识）
2. 点击卡片打开文档弹窗
3. 查看完整文档内容
4. 点击图片可以放大查看
5. 注意：文档内容受保护，无法复制

## 📄 License

MIT
