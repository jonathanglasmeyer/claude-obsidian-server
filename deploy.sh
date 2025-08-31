#!/bin/bash

set -e

echo "🚀 Deploying Claude Obsidian Bridge Server to Hetzner..."

# Configuration
REMOTE_HOST="hetzner"
REMOTE_PATH="~/obsidian-bridge-server"
PROJECT_NAME="quietloop-claude-obsidian-server"

# Function to run commands on remote host
remote_cmd() {
    ssh $REMOTE_HOST "$1"
}

# Check if SSH connection works
echo "🔍 Testing SSH connection..."
if ! remote_cmd "echo 'SSH connection successful'"; then
    echo "❌ SSH connection failed. Please check your SSH configuration."
    exit 1
fi

# Sync project files
echo "📦 Syncing project files..."
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    ./ $REMOTE_HOST:$REMOTE_PATH/

# Build and deploy on remote server
echo "🔨 Building and starting services on remote server..."

remote_cmd "cd $REMOTE_PATH && \
    echo '📦 Installing/updating dependencies...' && \
    cd server && npm install --production && \
    cd .. && \
    echo '🔄 Stopping existing services...' && \
    docker compose down || true && \
    echo '🚀 Starting services...' && \
    docker compose up -d --build && \
    echo '⏳ Waiting for services to be ready...' && \
    sleep 10 && \
    echo '🩺 Checking service health...' && \
    docker compose ps && \
    curl -f http://localhost:3001/health || echo 'Health check failed - check logs with: docker compose logs'"

echo "✅ Deployment complete!"
echo ""
echo "🔗 Service endpoints:"
echo "   Health: https://obsidian.quietloop.dev/health"
echo "   API: https://obsidian.quietloop.dev/api/"
echo ""
echo "📊 Monitor with:"
echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose logs -f'"
echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose ps'"