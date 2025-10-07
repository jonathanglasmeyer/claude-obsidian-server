# Discord Obsidian Bot

Discord bot that processes shared content into an Obsidian vault using Claude Code SDK. Each message creates a persistent conversation thread with full context and intelligent note creation.

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
- Claude Code OAuth Token
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

### Automated (Recommended)

Sync secrets and push:
```bash
./scripts/sync-secrets-to-github.sh
git push
```

Deploys automatically via GitHub Actions on push to main.

### Manual

```bash
./deploy.sh
```

## Monitoring

```bash
npm run logs       # Follow live logs
npm run status     # Container status
npm run health     # Health check
```

## Documentation

- [DISCORD-SETUP.md](discord-server/DISCORD-SETUP.md) - Discord configuration
- [CLAUDE.md](CLAUDE.md) - Comprehensive docs
- [docs/architecture/](docs/architecture/) - Technical details

## License

MIT
