#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the transaction simulator
while true; do
    echo "Starting transaction simulator..."
    node dist/index.js >> logs/simulator.log 2>&1
    echo "Process exited, restarting in 10 seconds..."
    sleep 10
done 