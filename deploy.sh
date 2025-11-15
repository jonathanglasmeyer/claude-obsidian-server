#!/bin/bash

set -e

echo "🚀 Deploying Discord Bot..."

# Configuration - customize these for your setup
REMOTE_HOST="${REMOTE_HOST:-your-server}"
REMOTE_PATH="${REMOTE_PATH:-~/discord-obsidian-bot}"

# Test SSH connection
echo "🔍 Testing SSH connection..."
if ! ssh "$REMOTE_HOST" "echo 'SSH connection successful'"; then
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
    ./ "$REMOTE_HOST:$REMOTE_PATH/"

# Build new image on remote server
echo "🔨 Building new Docker image on remote server..."
ssh "$REMOTE_HOST" "cd $REMOTE_PATH && \
    echo '📦 Installing dependencies...' && \
    cd discord-server && npm install --production && \
    cd .. && \
    echo '🏗️  Building new Docker image...' && \
    docker compose build"

# Deploy with zero-downtime using health checks
echo "🚀 Deploying with zero-downtime..."
ssh "$REMOTE_HOST" "cd $REMOTE_PATH && \
    echo '🔄 Starting new container...' && \
    docker compose up -d --no-deps discord-bot && \
    echo '⏳ Waiting for health check...' && \
    timeout 60 sh -c 'until docker inspect obsidian-server | grep -q \"\\\"Status\\\": \\\"healthy\\\"\"; do echo \"Waiting for container to be healthy...\"; sleep 2; done' && \
    echo '✅ Container healthy, deployment complete'"

# Final health check
echo "🩺 Final health check..."
ssh "$REMOTE_HOST" "cd $REMOTE_PATH && docker compose ps"
ssh "$REMOTE_HOST" "curl -f http://localhost:3001/health && echo '✅ Health check passed' || echo '⚠️  Health check failed - check logs'"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Monitor with:"
echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose logs -f'"
echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose ps'"
