#!/bin/bash
# Run shortcut manager integration test with Electron

cd "$(dirname "$0")"

echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "🚀 Running shortcut integration test..."
./node_modules/.bin/electron test-shortcut-integration.js
