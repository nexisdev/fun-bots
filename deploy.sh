#!/bin/bash

# Exit on error
set -e

echo "Starting deployment setup..."

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install PM2
echo "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Install dependencies
echo "Installing project dependencies..."
npm install

# Build project
echo "Building project..."
npm run build

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "PRIVATE_KEY=" > .env
    echo "RPC_URL=https://evm-testnet.nexis.network" >> .env
    echo "Please edit .env file and add your private key!"
fi

# Start application with PM2
echo "Starting application with PM2..."
pm2 delete transaction-simulator 2>/dev/null || true
pm2 start dist/testTransfer.js --name "transaction-simulator"

# Setup PM2 startup
echo "Setting up PM2 startup..."
pm2 startup
pm2 save

echo "Deployment complete!"
echo "Monitor logs with: pm2 logs transaction-simulator"
echo "Monitor process with: pm2 monit" 