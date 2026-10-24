#!/bin/bash
set -e

echo ">>> 1. Pulling latest code from GitHub..."
git pull

echo ">>> 2. Building frontend production bundle..."
npm run build

echo ">>> 3. Restarting Just2Pay via PM2..."
pm2 restart just2pay

echo ""
echo "========================================================"
echo "🎉 SUCCESS: Just2Pay has been updated to the latest version!"
echo "🌐 Visit: http://168.144.157.240"
echo "========================================================"
