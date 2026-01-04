#!/bin/bash

# Script to install git hooks
# This makes the hooks trackable in git

echo "📦 Installing git hooks..."

# Copy hooks from .githooks to .git/hooks
if [ -d ".githooks" ]; then
    for hook in .githooks/*; do
        if [ -f "$hook" ]; then
            hook_name=$(basename "$hook")
            cp "$hook" ".git/hooks/$hook_name"
            chmod +x ".git/hooks/$hook_name"
            echo "✅ Installed: $hook_name"
        fi
    done
    echo "🎉 Git hooks installed successfully!"
else
    echo "❌ .githooks directory not found"
    exit 1
fi

