#!/bin/bash

# Fix script for better-sqlite3 ELF header error
# This script reinstalls better-sqlite3 to ensure it's compiled for the current platform

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Fixing better-sqlite3 ELF header error...${NC}"

# Check if we're in the backend directory
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Please run this script from the backend directory${NC}"
    exit 1
fi

# Remove node_modules if it exists
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Removing existing node_modules...${NC}"
    rm -rf node_modules
fi

# Reinstall dependencies
echo -e "${GREEN}📦 Reinstalling dependencies...${NC}"
npm install

# Verify better-sqlite3 installation
echo -e "${GREEN}✅ Verification: Checking better-sqlite3...${NC}"
node -e "
try {
    const Database = require('better-sqlite3');
    console.log('better-sqlite3 loaded successfully!');
    process.exit(0);
} catch (error) {
    console.error('Error loading better-sqlite3:', error.message);
    process.exit(1);
}"

echo -e "${GREEN}🎉 Fix completed successfully!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Run './start.sh' to start the server"
echo -e "   2. If issues persist, check the logs: pm2 logs kktools"