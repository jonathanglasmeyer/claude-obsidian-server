#!/bin/bash

# Copy Claude config from persistent volume if it exists
if [ -f /home/node/.claude-config/.claude.json ]; then
    echo "Restoring Claude authentication from persistent storage..."
    cp /home/node/.claude-config/.claude.json /home/node/.claude.json
    cp /home/node/.claude-config/.claude.json.backup /home/node/.claude.json.backup 2>/dev/null || true
fi

# Function to save Claude config to persistent volume
save_claude_config() {
    if [ -f /home/node/.claude.json ]; then
        echo "Saving Claude authentication to persistent storage..."
        mkdir -p /home/node/.claude-config
        cp /home/node/.claude.json /home/node/.claude-config/.claude.json
        cp /home/node/.claude.json.backup /home/node/.claude-config/.claude.json.backup 2>/dev/null || true
    fi
}

# Set up signal handler to save config on container shutdown
trap save_claude_config SIGTERM SIGINT

# Start the Discord Bot
node bot.js &

# Wait for the application and handle signals
wait $!