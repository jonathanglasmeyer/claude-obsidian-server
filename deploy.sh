#!/bin/bash

set -e

echo "🚀 Deploying Discord Bot..."

# Configuration - customize these for your setup
REMOTE_HOST="your-server"
REMOTE_PATH="~/discord-obsidian-bot"

# Check for .env file
if [ ! -f discord-server/.env ]; then
    echo "❌ ERROR: discord-server/.env file not found"
    echo "Copy discord-server/.env.example to discord-server/.env and configure it"
    exit 1
fi

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

# Build and deploy on remote server
echo "🔨 Building and starting services on remote server..."

ssh "$REMOTE_HOST" "cd $REMOTE_PATH && \
    echo '📦 Installing dependencies...' && \
    cd discord-server && npm install --production && \
    cd .. && \
    echo '🔄 Stopping existing services...' && \
    docker compose down || true && \
    echo '🚀 Starting Discord Bot services...' && \
    docker compose up -d --build && \
    echo '⏳ Waiting for services to be ready...' && \
    sleep 10"

# Health check
echo "🩺 Checking service health..."
ssh "$REMOTE_HOST" "cd $REMOTE_PATH && docker compose ps"
ssh "$REMOTE_HOST" "curl -f http://localhost:3001/health || echo '⚠️  Health check failed - check logs'"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Monitor with:"
echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose logs -f'"
echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose ps'"
