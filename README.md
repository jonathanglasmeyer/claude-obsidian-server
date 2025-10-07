# Discord Obsidian Bot

A production Discord bot that processes shared content into an Obsidian vault using Claude Code SDK. Features conversation context, smart thread naming, and automated deployment.

## Overview

This bot monitors a Discord channel and creates persistent conversation threads with Claude. Each conversation operates within your Obsidian vault context, enabling intelligent note creation and vault operations.

## Features

- **Thread-based conversations**: Each Discord message creates a dedicated thread with full conversation history
- **Smart thread naming**: Automatic thread titles based on conversation content
- **Redis persistence**: Session data survives restarts with 24-hour TTL
- **Resource management**: Automatic cleanup of inactive threads
- **Production-ready**: Docker deployment with health monitoring and automated CI/CD

## Architecture

- **Discord Bot**: Node.js with discord.js + Claude Code SDK
- **Session Management**: Redis for persistent thread state
- **Deployment**: Docker Compose on Hetzner VPS
- **CI/CD**: GitHub Actions for automated deployment

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Discord Bot Token
- Claude Code OAuth Token
- Obsidian Vault

### Local Development

1. Clone the repository
2. Copy environment template:
   ```bash
   cd discord-server
   cp .env.example .env
   ```

3. Configure `.env` with your credentials:
   - `DISCORD_BOT_TOKEN` - From Discord Developer Portal
   - `DISCORD_INBOX_CHANNEL_ID` - Channel to monitor
   - `CLAUDE_CODE_OAUTH_TOKEN` - From Claude CLI
   - `OBSIDIAN_VAULT_PATH` - Path to your Obsidian vault

4. Start Redis:
   ```bash
   docker run -d -p 6379:6379 --name redis-dev redis:alpine
   ```

5. Start the bot:
   ```bash
   npm install
   npm run dev
   ```

### Discord Setup

See [DISCORD-SETUP.md](discord-server/DISCORD-SETUP.md) for detailed instructions on:
- Creating a Discord application
- Configuring bot permissions
- Getting your bot token
- Inviting the bot to your server

## Production Deployment

### GitHub Actions (Recommended)

Automated deployment on push to main:

1. Sync secrets to GitHub:
   ```bash
   ./scripts/sync-secrets-to-github.sh
   ```

2. Push changes:
   ```bash
   git push
   ```

Deployment happens automatically via GitHub Actions.

### Manual Deployment

```bash
./deploy.sh
```

Deploys to Hetzner VPS using Docker Compose.

## Project Structure

```
discord-server/          # Bot implementation
├── bot.js              # Main bot logic
├── lib/                # Core modules
│   ├── RedisThreadManager.js
│   ├── ThreadNamer.js
│   ├── ResponseFormatter.js
│   └── ...
├── Dockerfile          # Container definition
└── package.json        # Dependencies

.github/workflows/      # CI/CD automation
scripts/                # Deployment utilities
docs/                   # Architecture documentation
```

## Configuration

### Environment Variables

- `DISCORD_BOT_TOKEN` - Discord bot authentication
- `DISCORD_INBOX_CHANNEL_ID` - Channel ID to monitor
- `CLAUDE_CODE_OAUTH_TOKEN` - Claude API token
- `OBSIDIAN_VAULT_PATH` - Vault directory path
- `REDIS_URL` - Redis connection string
- `PORT` - HTTP server port (default: 3001)

### Discord Permissions Required

- View Channels
- Send Messages
- Send Messages in Threads
- Create Public Threads
- Create Private Threads
- Manage Threads
- Read Message History
- Add Reactions

## Monitoring

### Production

```bash
cd discord-server
npm run logs       # Follow live logs
npm run status     # Container status
npm run health     # Health check endpoint
```

### Local Development

Logs are written to `discord-server/bot.log` for debugging.

## Documentation

- [CLAUDE.md](CLAUDE.md) - Comprehensive project documentation
- [DISCORD-SETUP.md](discord-server/DISCORD-SETUP.md) - Discord configuration guide
- [docs/architecture/](docs/architecture/) - Technical architecture details
- [docs/features/](docs/features/) - Feature specifications

## License

MIT

## Contributing

Contributions welcome. Please ensure:
- No secrets in commits
- Follow existing code style
- Update documentation for new features
