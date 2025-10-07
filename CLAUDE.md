# CLAUDE.md - Discord Obsidian Bot

## Project Overview
Discord bot for intelligently processing shared content into Obsidian vault using Claude Code SDK directly. Production-ready system with thread-based conversation management, automated deployment via GitHub Actions.

## Current Status: Production Ready
- Production: Discord bot running on Hetzner VPS (Docker + Redis)
- Features: Conversation context, smart thread naming, resource management
- CI/CD: Automated deployment via GitHub Actions on push to main

## Architecture

### Core Components
- **Discord Bot**: Claude Code SDK + Thread Management
- **Redis**: Session persistence with 24h TTL
- **Docker**: Multi-container setup (bot + redis)
- **Vault**: Claude Code CLI operates in actual Obsidian vault directory

### Security
- **Environment Variables**: Secrets stored in `discord-server/.env` (gitignored)
- **GitHub Secrets**: Production secrets managed via GitHub Actions
- **Access Control**: Health endpoint public, admin endpoints SSH-only

## Development Workflow

### Quick Start
```bash
# Start Redis
docker run -d -p 6379:6379 --name redis-dev redis:alpine

# Start bot
cd discord-server && npm run dev
```

### Monitoring
```bash
# Local development
tail -f discord-server/bot.log

# Production
npm run logs       # Follow live logs
npm run status     # Container status
npm run health     # Health check
```

### Split of Responsibility
- **User**: Runs `npm run dev` in terminal, sees live output, controls process
- **Claude**: Reads `bot.log` file for debugging and monitoring
- **Benefit**: No port conflicts, user maintains control, Claude can help debug

## Discord Bot Structure

**Core Flow**: Discord message → Thread creation → Claude processing → Response formatting

**Key Components**:
- `ThreadManager` - Conversation context management
- `RedisThreadManager` - Persistent thread state
- `ThreadNamer` - Smart thread naming
- `ResponseFormatter` - Message formatting
- `ErrorHandler` - Error handling
- `ProgressReporter` - Progress indicators

## Production Deployment

### Automated via GitHub Actions

**Trigger**: Push to `main` with changes to:
- `discord-server/**`
- `docker-compose.yml`
- `deploy.sh`
- `.github/workflows/deploy-discord-bot.yml`

**Deploy Flow**:
1. Bun setup + dependency installation
2. SSH setup via GitHub Secrets
3. Create `.env` from GitHub Secrets
4. Execute `deploy.sh` (CI mode)
5. Health check + deployment summary

### GitHub Secrets Setup (One-Time)

```bash
./scripts/sync-secrets-to-github.sh
```

**What it does**:
- Reads all secrets from `discord-server/.env` and syncs to GitHub
- Auto-detects Hetzner SSH config from `~/.ssh/config`
- Validates all required secrets are configured

**Required Secrets**:
- `DISCORD_BOT_TOKEN` - Discord bot authentication
- `DISCORD_INBOX_CHANNEL_ID` - Channel for bot messages
- `CLAUDE_CODE_OAUTH_TOKEN` - Claude API authentication
- `HETZNER_SSH_KEY` - SSH private key for deployment
- `HETZNER_HOST` - VPS IP address
- `HETZNER_USER` - SSH user

**When to Re-run**:
- Initial setup (one-time)
- When secrets change
- When rotating credentials

### Manual Deployment

```bash
./deploy.sh  # Detects CI mode automatically
```

## Production Infrastructure

### Architecture
```
Production Domain (SSL: Let's Encrypt)
├── Reverse Proxy (Caddy) - ports 80/443
├── Discord Bot Container - port 3001
└── Redis Container - port 6379
```

**Network**: All services communicate via shared Docker network.

### Management Commands
```bash
# Container status
ssh production-server "cd ~/obsidian-bridge-server && docker compose ps"

# Restart services
ssh production-server "cd ~/obsidian-bridge-server && docker compose restart"

# View logs
ssh production-server "docker logs obsidian-server --tail 20"
ssh production-server "docker logs obsidian-redis --tail 20"
```

### Critical Configuration
- **SSL**: Let's Encrypt via Caddy, automatic renewal
- **Data**: Redis persistence with Docker volumes, 24h session TTL
- **Network**: Shared Docker network for inter-service communication
- **Environment**: `CLAUDE_CODE_OAUTH_TOKEN` + `OBSIDIAN_VAULT_PATH` required

## Common Issues & Solutions

### Redis Connection Error
**Problem**: Redis container not running locally

**Fix**:
```bash
docker run -d -p 6379:6379 --name redis-dev redis:alpine
docker ps | grep redis  # Verify running
```

**Note**: Discord bot REQUIRES Redis for thread management - no fallback mode

### Bot Doesn't Respond
**Check**:
- Discord token in `.env`: `DISCORD_BOT_TOKEN`
- Channel ID in `.env`: `DISCORD_INBOX_CHANNEL_ID`
- Claude auth in `.env`: `CLAUDE_CODE_OAUTH_TOKEN`

### Invalid Working Directory
**Problem**: Claude Code SDK can't find vault

**Fix**: Set `OBSIDIAN_VAULT_PATH` to your actual vault directory in `.env`

### Sessions Not Persisting
**Check**: Redis connection in `/health` endpoint

**Fix**: Ensure Redis is running (see Redis Connection Error above)

### Claude CLI Authentication
**Fix**: Run `claude setup-token` and copy token to `.env` as `CLAUDE_CODE_OAUTH_TOKEN`

## Documentation

### Architecture
- [infrastructure.md](docs/architecture/infrastructure.md) - Production infrastructure details

### Features
- [discord-bot-performance-optimization.md](docs/features/discord-bot-performance-optimization.md) - Performance optimization specs

### Technical Reference
- [claude-code-sdk-session-management.md](docs/claude-code-sdk-session-management.md) - Claude Code SDK integration details
