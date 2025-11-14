#!/bin/bash

# GAS-PA Initial Setup Script for Ubuntu Server
# Run this script after cloning the repository

echo "========================================="
echo "   GAS-PA Initial Setup"
echo "========================================="

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Install clasp globally if not installed
if ! command -v clasp &> /dev/null; then
    echo ""
    echo "📦 Installing @google/clasp globally..."
    npm install -g @google/clasp
fi

echo "✅ clasp found: $(clasp --version)"

# Create necessary directories
echo ""
echo "📁 Creating project directories..."
mkdir -p dist
mkdir -p releases
mkdir -p logs

# Make scripts executable
chmod +x scripts/deploy.sh

echo ""
echo "========================================="
echo "   Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Authenticate with Google:"
echo "   clasp login"
echo ""
echo "2. Create a new Apps Script project:"
echo "   clasp create --type webapp --title 'GAS-PA'"
echo ""
echo "3. Build the project:"
echo "   npm run build"
echo ""
echo "4. Deploy to Google Apps Script:"
echo "   npm run push"
echo ""
echo "5. Open in browser and run setup:"
echo "   clasp open"
echo "   Then run the setup() function"
echo ""
echo "For more information, see README.md"
