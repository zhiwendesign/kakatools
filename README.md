# KKTools Resource Library (卡卡资源库)

这是一个基于 React 和 Tailwind CSS 构建的资源导航网站，包含 AI、设计、学习及**Starlight Academy**专属资源。项目采用前后端分离的架构，使用 JSON 文件存储数据，并配备 Node.js 后端服务用于管理员权限验证及访问密钥管理。

## 📁 目录结构

```
kktools/
├── data/                  # 资源数据文件 (JSON)
│   ├── ai.json            # AI 分类资源
│   ├── design.json        # 设计分类资源
│   ├── learning.json      # 学习分类资源
│   └── starlight.json     # [NEW] Starlight Academy 专属资源
├── index.html            # 前端入口文件 (单页应用)
├── server.js              # 后端验证服务器 (Node.js)
├── package.json           # 项目依赖配置
└── README.md              # 项目说明文档
```

## 🚀 快速开始

### 1. 环境准备
确保您的电脑上安装了以下软件：
- [Node.js](https://nodejs.org/) (用于运行后端和管理依赖)
- Python (可选，仅用于快速启动前端静态服务)

### 2. 安装依赖
在项目根目录下打开终端，运行：
```bash
npm install
```

### 3. 启动项目
**注意：新功能 (Starlight Academy) 依赖后端服务，请务必同时启动。**

#### 步骤 A: 启动后端服务 (验证 / Key 管理)
在一个终端窗口中运行：
```bash
# 如果之前已经运行，请先 Ctrl+C 停止再重启
node server.js
```
*成功提示：Server is running on http://localhost:3000*

#### 步骤 B: 启动前端服务
由于浏览器的安全策略（CORS），你不能直接双击打开 HTML 文件。需要启动一个静态服务器。
打开一个新的终端窗口，运行：

**Python 3:**
```bash
python3 -m http.server 8000
```

### 4. 访问网站
打开浏览器访问：
[http://localhost:8000/index.html](http://localhost:8000/index.html)

---

## ✨ 新功能：Starlight Academy (星光学院)

这是一个受保护的专属资源区域。
- **访问权限**：普通用户点击 "Starlight Academy" Tab 时，需要输入 **8位访问密钥 (Access Key)** 才能解锁内容。
- **密钥验证**：密钥由管理员生成，具有有效期（如30天）。验证通过后，浏览器会缓存权限。

## 🔐 管理员功能 & 密钥管理

点击页面上的 "设置" 图标或 "登录" 按钮进行管理员验证。
**默认管理员密码**: `admin`

登录后，您将看到左侧边栏新增了 **"Access Keys"** 选项：

### 🔑 生成访问密钥 (Access Keys)
1.  进入 **Access Keys** 面板。
2.  输入有效期天数 (默认 30 天)。
3.  点击 **Generate**。
4.  系统会生成一个 8 位代码 (e.g., `X7Y8Z9A0`)。
5.  将此代码发送给用户即可。

### 其他管理功能
- **撤销密钥**：在列表中点击垃圾桶图标即可立即让密钥失效。
- **查看状态**：可以查看所有有效密钥及其过期时间。
- **常规管理**：编辑现有资源卡片、添加新资源、修改标题头像等。

## ⚙️ 配置说明

### 修改管理员密码
打开 `server.js` 文件，找到以下代码进行修改：
```javascript
// Hardcoded admin password
const ADMIN_PASSWORD = '此处修改你的密码';
```
修改后**必须重启后端服务**。

### API 接口说明 (server.js)
后端增加了以下接口用于密钥管理：
- `POST /api/keys/generate` (需管理员权限)
- `POST /api/keys/verify` (公开)
- `GET /api/keys` (需管理员权限)
- `DELETE /api/keys/:code` (需管理员权限)

## ⚠️ 常见问题

1.  **Starlight Academy 点击无反应或报错？**
    *   确保 `node server.js` 正在运行。
    *   确保前端是通过 `localhost:8000` 访问的。

2.  **生成的 Key 无效？**
    *   Key 是区分大小写的 (虽然前端会自动转大写)，请确保输入正确。
    *   检查 Key 是否已过期或被撤销。

3.  **登录失败 / 网络错误**
    *   检查 `index.html` 中的 `API_BASE_URL` 是否为 `http://localhost:3000`。
