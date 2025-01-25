#!/bin/bash

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js and npm if not already installed
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install build essentials
sudo apt-get install -y build-essential

# Create project directory if it doesn't exist
mkdir -p ~/evm-simulator
cd ~/evm-simulator

# Install project dependencies
npm install

# Build the project
npm run build

# Create logs directory
mkdir -p logs

# Set up systemd service
sudo cp evm-simulator.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable evm-simulator
sudo systemctl start evm-simulator

# Show service status
sudo systemctl status evm-simulator 