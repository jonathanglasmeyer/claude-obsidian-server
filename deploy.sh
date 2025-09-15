#!/bin/bash

set -e

echo "🚀 Deploying Claude Obsidian Bridge Server to Hetzner..."

# Configuration
REMOTE_HOST="hetzner"
REMOTE_PATH="~/obsidian-bridge-server"
PROJECT_NAME="quietloop-claude-obsidian-server"

# Load Claude token from local server/.env
if [ -f server/.env ]; then
    source server/.env
    echo "🔑 Loaded environment from server/.env"
    if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
        echo "🔑 Claude token found in server/.env"
    else
        echo "⚠️ WARNING: No CLAUDE_CODE_OAUTH_TOKEN in server/.env. Server will fail authentication."
    fi
else
    echo "❌ ERROR: server/.env file not found"
    exit 1
fi

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

# Sync project files (optimized with .dockerignore exclusions)
echo "📦 Syncing project files..."
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='**/.cxx/' \
    --exclude='**/.gradle/' \
    --exclude='**/build/' \
    --exclude='**/.cache/' \
    --exclude='metro-logs.txt' \
    ./ $REMOTE_HOST:$REMOTE_PATH/

# Build and deploy on remote server
echo "🔨 Building and starting services on remote server..."

remote_cmd "cd $REMOTE_PATH && \
    echo '📦 Installing/updating dependencies...' && \
    cd server && npm install --production && \
    cd .. && \
    echo '🌐 Ensuring shared Docker network exists...' && \
    docker network inspect quietloop-network >/dev/null 2>&1 || docker network create quietloop-network && \
    echo '🧹 Cleaning Docker artifacts before build...' && \
    docker system prune -f --volumes || true && \
    echo '🔄 Stopping existing services...' && \
    docker compose down || true && \
    echo '🚀 Starting services (with optimized build)...' && \
    CLAUDE_CODE_OAUTH_TOKEN=\"$CLAUDE_CODE_OAUTH_TOKEN\" docker compose up -d --build && \
    echo '🔧 Fixing vault permissions for container UID mapping...' && \
    chown -R 1000:1000 /srv/claude-jobs/obsidian-vault && \
    echo '⏳ Waiting for services to be ready...' && \
    sleep 15 && \
    echo '🩺 Checking service health...' && \
    docker compose ps && \
    curl -f http://localhost:3001/health || echo 'Health check failed - check logs with: docker compose logs' && \
    echo '📊 Docker system usage after build:' && \
    docker system df"

echo "✅ Deployment complete!"
echo ""
echo "🔗 Service endpoints:"
echo "   Health: https://obsidian.quietloop.dev/health"
echo "   API: https://obsidian.quietloop.dev/api/"
echo ""
echo "📊 Monitor with:"
echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose logs -f'"
echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose ps'"