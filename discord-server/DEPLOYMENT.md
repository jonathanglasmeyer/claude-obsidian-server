# Discord Bot Deployment Guide

## Phase 3: Docker Deployment - COMPLETED ✅

The Discord Bot is now production-ready with Docker deployment on Hetzner infrastructure.

## Quick Deployment

### 1. Environment Setup
```bash
# Copy production environment template
cp discord-server/.env.production discord-server/.env

# Edit with your actual tokens:
# - DISCORD_BOT_TOKEN (from Discord Developer Portal)
# - CLAUDE_CODE_OAUTH_TOKEN (from Claude CLI)
# - DISCORD_INBOX_CHANNEL_ID (Discord channel ID)
```

### 2. Deploy to Production
```bash
# Deploy to Hetzner server
./deploy.sh
```

## Architecture

### Docker Services
- **discord-bot**: Main Discord bot container on port 3001
- **redis**: Shared Redis instance with keyspace events enabled
- **Network**: Uses existing `quietloop-network` for Caddy integration

### URL & Health Check
- **Production URL**: `https://obsidian.quietloop.dev`
- **Health Endpoint**: `https://obsidian.quietloop.dev/health`
- **Container Name**: `obsidian-server` (maintains existing Caddy routing)

### Features Enabled
- ✅ Event-driven thread management via Redis keyspace events
- ✅ Persistent Claude Code CLI authentication
- ✅ Health monitoring with Bot + Redis status
- ✅ Auto-restart on failure
- ✅ Integrated with existing infrastructure

## Development vs Production

### Development (Local)
```bash
cd discord-server
npm run dev  # Bun --watch with hot reload
```

### Production (Hetzner)
```bash
./deploy.sh  # Automated Docker deployment
```

## Monitoring

### Health Status
```bash
# Via public endpoint
curl https://obsidian.quietloop.dev/health

# Direct server access
ssh hetzner "curl localhost:3001/health"
```

### Container Logs
```bash
# Real-time logs
ssh hetzner "cd ~/obsidian-bridge-server && docker compose logs -f discord-bot"

# Container status
ssh hetzner "cd ~/obsidian-bridge-server && docker compose ps"
```

### Redis Monitoring
```bash
# Connect to Redis
ssh hetzner "docker exec -it obsidian-redis redis-cli"

# Check thread data
ssh hetzner "docker exec -it obsidian-redis redis-cli keys 'thread:*'"
```

## Troubleshooting

### Common Issues

**Bot won't start:**
```bash
# Check environment variables
ssh hetzner "cd ~/obsidian-bridge-server && docker compose logs discord-bot | grep -i error"

# Verify tokens in .env file
ssh hetzner "cd ~/obsidian-bridge-server/discord-server && grep -E '(DISCORD_BOT_TOKEN|CLAUDE_CODE_OAUTH_TOKEN)' .env"
```

**Claude authentication fails:**
```bash
# Check Claude config persistence
ssh hetzner "cd ~/obsidian-bridge-server && docker exec obsidian-server ls -la /home/node/.claude*"

# Restore authentication manually if needed
ssh hetzner "cd ~/obsidian-bridge-server && docker compose down && docker compose up -d"
```

**Redis connection issues:**
```bash
# Check Redis container
ssh hetzner "docker exec obsidian-redis redis-cli ping"

# Verify network connectivity
ssh hetzner "docker exec obsidian-server nc -zv redis 6379"
```

## Infrastructure Integration

### Existing Caddy Routing
The Discord Bot reuses the existing `obsidian.quietloop.dev` domain and Caddy configuration from the Legacy obsidian-server. No changes needed to:
- Caddy configuration
- DNS settings
- SSL certificates
- Port registry

### Shared Resources
- **Docker Network**: `quietloop-network`
- **Redis Instance**: Shared between services
- **Vault Path**: `/srv/claude-jobs/obsidian-vault`
- **Claude Config**: Persistent via Docker volume

## Next Steps

With Phase 3 complete, the Discord Bot is production-ready. Future enhancements are documented in `POST-MVP-FEATURES.md`:

- Content processing (URLs, files, images)
- Advanced command system
- Analytics and monitoring
- Multi-channel support

The bot can be safely deployed and will automatically handle Discord conversations with Claude Code SDK integration.