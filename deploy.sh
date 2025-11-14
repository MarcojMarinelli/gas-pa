#!/bin/bash
set -e

echo "🚀 Deploying to Google Apps Script..."

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build

# Push to Apps Script
echo "⬆️ Pushing to Apps Script..."
clasp push -f

# Create version
VERSION="v$(date +%Y%m%d-%H%M%S)"
echo "🏷️ Creating version: $VERSION"
clasp version "$VERSION"

# Deploy
echo "🌐 Deploying..."
DEPLOYMENT_ID=$(clasp deploy -d "$VERSION" | grep -oP '(?<=- ).*(?= @)')
echo "✅ Deployed: $DEPLOYMENT_ID"

# Save deployment info
echo "$DEPLOYMENT_ID" > .last-deployment
echo "Deployment complete!"
