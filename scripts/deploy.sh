#!/bin/bash

# GAS-PA Deployment Script
# This script builds and deploys the GAS-PA project

echo "🚀 Building GAS-PA..."
npm run build

echo "📦 Creating bundle for manual deployment..."
mkdir -p releases/$(date +%Y%m%d_%H%M%S)

# Combine all TypeScript files into a single bundle
cat dist/*.js > releases/$(date +%Y%m%d_%H%M%S)/bundle.gs

# Copy individual files for selective updates
cp -r dist/* releases/$(date +%Y%m%d_%H%M%S)/

# Copy appsscript.json
cp src/appsscript.json releases/$(date +%Y%m%d_%H%M%S)/

echo "⬆️ Pushing to Google Apps Script..."
clasp push

echo "📊 Checking deployment status..."
clasp deployments

echo "✅ Deployment complete!"
echo "📝 Bundle saved to: releases/$(date +%Y%m%d_%H%M%S)/"
echo ""
echo "Next steps:"
echo "1. Run 'clasp open' to open the script editor"
echo "2. Run 'clasp run setup' to initialize the project"
echo "3. Run 'npm run logs' to view logs"
