#!/bin/bash

set -e

echo "🚀 Deploying Claude Obsidian Bridge Server to Hetzner..."

# Configuration
REMOTE_HOST="hetzner"
REMOTE_PATH="~/obsidian-bridge-server"
PROJECT_NAME="quietloop-claude-obsidian-server"
SERVICE_URL="https://obsidian.quietloop.dev"

# Load port validation from infra repo
INFRA_SCRIPTS="../quietloop-hetzner-infra/scripts"
if [ -f "$INFRA_SCRIPTS/validate-local-ports.sh" ]; then
    source "$INFRA_SCRIPTS/validate-local-ports.sh"
else
    echo "⚠️ Port validation script not found - skipping validation"
    validate_local_ports() { return 0; }
fi

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

# Pre-deployment validation
validate_local_ports "$PROJECT_NAME" || exit 1

# Test SSH connection
echo "🔍 Testing SSH connection..."
if ! ssh "$REMOTE_HOST" "echo 'SSH connection successful'"; then
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

# Use centralized cleanup if available
if command -v cleanup_docker_system >/dev/null 2>&1; then
    cleanup_docker_system "$REMOTE_HOST"
else
    ssh "$REMOTE_HOST" "cd $REMOTE_PATH && docker system prune -f --volumes || true"
fi

ssh "$REMOTE_HOST" "cd $REMOTE_PATH && \
    echo '📦 Installing/updating dependencies...' && \
    cd server && npm install --production && \
    cd .. && \
    echo '🌐 Ensuring shared Docker network exists...' && \
    docker network inspect quietloop-network >/dev/null 2>&1 || docker network create quietloop-network && \
    echo '🔄 Stopping existing services...' && \
    docker compose down || true && \
    echo '🚀 Starting services (with optimized build)...' && \
    CLAUDE_CODE_OAUTH_TOKEN=\"$CLAUDE_CODE_OAUTH_TOKEN\" docker compose up -d --build && \
    echo '🔧 Fixing vault permissions for container UID mapping...' && \
    chown -R 1000:1000 /srv/claude-jobs/obsidian-vault && \
    echo '⏳ Waiting for services to be ready...' && \
    sleep 15"

# Post-deployment verification (if utilities available)
if command -v check_docker_health >/dev/null 2>&1; then
    check_docker_health "$REMOTE_HOST" "3001"
    deployment_summary "$PROJECT_NAME" "$REMOTE_HOST" "$SERVICE_URL"
else
    # Fallback health check
    echo "🩺 Checking service health..."
    ssh "$REMOTE_HOST" "cd $REMOTE_PATH && docker compose ps"
    ssh "$REMOTE_HOST" "curl -f http://localhost:3001/health || echo 'Health check failed - check logs'"

    echo "✅ Deployment complete!"
    echo ""
    echo "🔗 Service endpoints:"
    echo "   Health: $SERVICE_URL/health"
    echo "   API: $SERVICE_URL/api/"
    echo ""
    echo "📊 Monitor with:"
    echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose logs -f'"
    echo "   ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose ps'"
fi