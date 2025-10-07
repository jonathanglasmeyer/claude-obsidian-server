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

1. Clone repository and setup environment:
   ```bash
   cd discord-server
   cp .env.example .env
   ```

2. Configure `.env`:
   ```
   DISCORD_BOT_TOKEN=your_token
   DISCORD_INBOX_CHANNEL_ID=channel_id
   CLAUDE_CODE_OAUTH_TOKEN=your_token
   OBSIDIAN_VAULT_PATH=/path/to/vault
   ```

3. Start Redis and bot:
   ```bash
   docker run -d -p 6379:6379 --name redis-dev redis:alpine
   npm install
   npm run dev
   ```

## Production Deployment

**Note**: The included deployment scripts deploy only the bot containers. Reverse proxy setup (Caddy, nginx, etc.) and SSL certificates are not covered. The bot exposes port 3001 for health checks - configure your reverse proxy accordingly if you want external access.

### Automated (Reference Implementation)

This project includes a Hetzner-specific GitHub Actions workflow as reference:

```bash
./scripts/sync-secrets-to-github.sh  # Syncs secrets to GitHub
git push  # Triggers automated deployment
```

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
- [CLAUDE.md](CLAUDE.md) - Comprehensive docs
- [docs/architecture/](docs/architecture/) - Technical details

## License

MIT
