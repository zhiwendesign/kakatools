#!/bin/bash

# KKTools 后端启动脚本
# 支持开发和生产模式

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting KKTools Backend...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 is not installed. Installing...${NC}"
    npm install -g pm2
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from env.example...${NC}"
    cp env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your configuration${NC}"
fi

# 检查数据库目录
mkdir -p data/uploads
mkdir -p ../logs

# 选择模式
MODE=${1:-production}

if [ "$MODE" = "dev" ] || [ "$MODE" = "development" ]; then
    echo -e "${GREEN}🔧 Starting in development mode...${NC}"
    NODE_ENV=development node server.js
else
    echo -e "${GREEN}📦 Starting in production mode with PM2...${NC}"
    
    # 停止现有进程
    pm2 stop kktools 2>/dev/null || true
    pm2 delete kktools 2>/dev/null || true
    
    # 启动服务
    cd ..
    pm2 start ecosystem.config.js --env production
    
    echo -e "${GREEN}✅ Server started!${NC}"
    echo -e "${GREEN}📊 View logs: pm2 logs kktools${NC}"
    echo -e "${GREEN}📈 Monitor: pm2 monit${NC}"
    echo -e "${GREEN}🔄 Restart: pm2 restart kktools${NC}"
    echo -e "${GREEN}⏹️  Stop: pm2 stop kktools${NC}"
fi

