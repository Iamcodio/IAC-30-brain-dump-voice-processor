#!/bin/bash
# Run window properties deep test with Electron

cd "$(dirname "$0")"

echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "🚀 Running window properties test..."
./node_modules/.bin/electron test-window-properties.js
