#!/bin/bash

echo "🚀 Setting up GAS development environment on Ubuntu..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Install global packages
sudo npm install -g @google/clasp typescript ts-node

# Create project structure
mkdir -p ~/projects/gas-pa/{src,dist,tests}
cd ~/projects/gas-pa

# Initialize project
npm init -y
npm install --save-dev @types/google-apps-script typescript

# Create initial source file
cat > src/main.ts << 'EOFILE'
function doGet() {
  return HtmlService.createHtmlOutput('<h1>Hello from Ubuntu Server!</h1>');
}

function testFunction() {
  console.log('Deployed from Ubuntu Server at:', new Date());
}
EOFILE

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy your .clasprc.json from local machine"
echo "2. Update .clasp.json with your script ID"
echo "3. Run: npm run push"
