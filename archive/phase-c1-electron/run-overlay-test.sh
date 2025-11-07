#!/bin/bash
# Run overlay window manual test with Electron

cd "$(dirname "$0")"

echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "🚀 Running overlay window test..."
./node_modules/.bin/electron test-overlay-manual.js
