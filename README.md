# Discord Obsidian Bot

Mobile access to Claude Code within your Obsidian vault. Built using the [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview).

Chat with your vault and ingest content from anywhere via Discord. On desktop, use Claude Code directly. On mobile, use this.

**Security Note**: Deploy this on a private Discord server that only you control. The bot has full access to your Obsidian vault.

## Features

- Thread-based conversations with full history
- Smart thread naming based on conversation content
- Redis persistence with 24-hour TTL
- Automatic cleanup of inactive threads
- Docker deployment with health monitoring
- Automated CI/CD via GitHub Actions

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Discord Bot Token ([setup guide](discord-server/DISCORD-SETUP.md))
- Claude Code OAuth Token (run `claude setup-token` and add to `.env`)
- Obsidian Vault

### Local Development

1. Setup environment:
   ```bash
   cd discord-server
   cp .env.example .env
   # Edit .env with:
   #   - DISCORD_BOT_TOKEN (from Discord setup guide)
   #   - DISCORD_INBOX_CHANNEL_ID (channel to monitor)
   #   - CLAUDE_CODE_OAUTH_TOKEN (from claude setup-token)
   #   - OBSIDIAN_VAULT_PATH (path to your Obsidian vault)
   ```

2. Start Redis and bot:
   ```bash
   docker run -d -p 6379:6379 --name redis-dev redis:alpine
   npm install
   npm run dev
   ```

**Note**: The `.env` file is only needed for local development. For production deployment via GitHub Actions, configure secrets in your repository settings instead.

## Production Deployment

**Note**: The bot connects to Discord via WebSocket - no public HTTP access required. The deployment scripts handle only the bot containers. Port 3001 exposes a health check endpoint for monitoring (optional). Reverse proxy setup (Caddy, nginx, etc.) is not needed unless you want external access to health checks.

### Automated (Reference Implementation)

This project includes a GitHub Actions workflow as reference. First, sync your secrets:

```bash
./scripts/sync-secrets-to-github.sh
# Reads discord-server/.env and syncs to GitHub repository secrets
```

Then deploy:
```bash
git push  # Triggers automated deployment
```

**Note**: You need `discord-server/.env` locally only to run the sync script. GitHub Actions will use the synced secrets for deployment.

### Docker Compose (Generic)

For deployment on any Docker host:

```bash
# Build and run containers
docker compose up -d

# Check health
curl http://localhost:3001/health
```

Customize `docker-compose.yml` and networking for your infrastructure.

## Monitoring

```bash
npm run logs       # Follow live logs
npm run status     # Container status
npm run health     # Health check
```

## Documentation

- [DISCORD-SETUP.md](discord-server/DISCORD-SETUP.md) - Discord bot configuration
- [CLAUDE.md](CLAUDE.md) - Comprehensive docs for development and deployment

## License

MIT
