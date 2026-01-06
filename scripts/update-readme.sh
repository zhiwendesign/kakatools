#!/bin/bash

# Script to manually update README.md
# This script can be run manually or integrated into CI/CD

README_FILE="README.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ ! -f "$README_FILE" ]; then
    echo "❌ README.md not found"
    exit 1
fi

# Update timestamp
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/最后更新：.*/最后更新：$TIMESTAMP/" "$README_FILE" 2>/dev/null
else
    # Linux
    sed -i "s/最后更新：.*/最后更新：$TIMESTAMP/" "$README_FILE" 2>/dev/null
fi

echo "✅ README.md updated with timestamp: $TIMESTAMP"

