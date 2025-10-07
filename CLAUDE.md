# CLAUDE.md - Mobile Obsidian Vault Integration

## Project Overview
Discord bot + bridge server for intelligently processing shared content into Obsidian vault using Claude Code SDK directly. Production-ready system with thread-based conversation management.

## Current Status: Discord Bot Production Ready 🚀
- ✅ **Production Server**: Internal Discord bot (Docker on Hetzner VPS) - No public domain
- ✅ **Discord Bot**: Phase 2.1 + 2.2 complete with conversation context, smart thread naming, and resource management (`discord-server/`)
- 🔄 **Next**: Phase 2.3 Security + 2.4 Content Processing OR Phase 3 Docker deployment
- 📦 **Legacy**: Android app (`ObsidianShare/`) and web prototype (`web-prototype/`) - functional but inactive

## Architecture & Components

### Security
- **API Protection**: All endpoints secured with `x-api-key` header validation
- **Environment Variables**: API keys stored in `.env` files (gitignored)
  - Server: `API_SECRET_KEY` in `server/.env`
  - Android: `EXPO_PUBLIC_API_SECRET_KEY` in `ObsidianShare/.env`
  - Web: `API_SECRET_KEY` in `web-prototype/.env.local`
- **Production**: Same API key deployed via Docker environment variables
- **Access Control**: Only health endpoint (`/health`) bypasses authentication

### Local Development
- **Server**: `server/` - Bridge server with AI SDK v5 + Redis session persistence
- **Android**: `ObsidianShare/` - React Native with Drawer Navigator + streaming chat
- **Web**: `web-prototype/` - Next.js with AI SDK hooks
- **Vault**: Claude Code CLI operates in actual Obsidian vault directory

### Port Allocation
- **Production**: Port `3001` (registered in `/opt/quietloop-infra/PORT-REGISTRY.md`)
- **Local Dev**: Port `3001` (matches production)
- **Web Prototype**: Port `3002` (development only)
- **Redis**: Port `6379` (internal only)
- **Next Available**: Port `3003` (for new services)

**⚠️ Port Requirements:**
- ALWAYS check `PORT-REGISTRY.md` before choosing ports
- Use `validate_port_usage()` in deployment scripts
- Update registry when deploying new services

## Quick Development Commands

### Start Development Environment

**⚠️ PREREQUISITES: Redis must be running locally**
```bash
# 1. Start Redis for local development (REQUIRED)
docker run -d -p 6379:6379 --name redis-dev redis:alpine

# 2. Discord bot server (ACTIVE)
cd discord-server && npm run dev  # → Bun --watch with colors + tee logging

# Legacy bridge server (for comparison/reference)
cd server && OBSIDIAN_VAULT_PATH=/Users/jonathan.glasmeyer/Projects/obsidian-vault CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_CODE_OAUTH_TOKEN node index.js

# Legacy web prototype
cd web-prototype && pnpm run dev  # → http://localhost:3002

# Legacy Android development
cd ObsidianShare && npx expo start  # → exp://192.168.178.147:8081
```

### Discord Bot Development Workflow

**Local Development with Public URL (SSH Tunnel - NOT ngrok):**
```bash
# Terminal 1: Start Redis (if not already running via Docker Desktop)
docker run -d -p 6379:6379 --name redis-dev redis:alpine

# Terminal 2: Create SSH tunnel to expose local dev via public URL
ssh -R 0.0.0.0:3099:localhost:3001 -f -N hetzner
# This exposes your local :3001 via https://obsidian-dev.quietloop.dev

# Terminal 3: Start Discord bot
cd discord-server
npm run dev  # Bun --watch with auto-restart + logs to bot.log

# Test endpoints
curl http://localhost:3001/health                    # Local
curl https://obsidian-dev.quietloop.dev/health       # Public (via tunnel)
```

**Monitoring (Claude's perspective):**
```bash
# Claude monitors via log file (read-only)
tail -f discord-server/bot.log
cat discord-server/bot.log
```

**Notes:**
- SSH tunnel port 3099 registered in `~/Projects/quietloop-hetzner-infra/PORT-REGISTRY.md`
- Caddy config: `~/Projects/quietloop-hetzner-infra/projects/obsidian-dev.caddy`
- Tunnel uses VPS as reverse proxy (stable URL, no ngrok needed)

### Production Monitoring Commands
```bash
# Production container status and health
cd discord-server
npm run status    # → docker compose ps
npm run health    # → curl production health endpoint

# Production logs monitoring
npm run logs      # → Follow live logs (Ctrl+C to exit)
npm run logs:tail # → Show last 50 log entries

# Management endpoints (SSH-only, not publicly exposed)
npm run health    # → Check production health (pretty JSON)
npm run cleanup   # → ⚠️ DELETE ALL Discord threads (ADMIN ONLY)

# Local development equivalents
npm run health:local  # → Check local health
npm run cleanup:local # → Clean local threads
```

### Session Handover
**For new Claude sessions:**
- Status: Phase 2.1 ✅ + Phase 2.2 ✅ (Smart Thread Naming + Resource Management complete)
- Next: Phase 2.3 Security OR Phase 2.4 Content Processing OR Phase 3 Docker Deployment
- Quick start: `cd discord-server && npm run dev`
- Features: Conversation context, smart thread naming, event-driven cleanup, Redis persistence

**Split of Responsibility:**
- ✅ **User**: Runs `npm run dev` in terminal, sees live output, controls process
- ✅ **Claude**: Reads `bot.log` file for debugging and monitoring
- ✅ **Benefit**: No port conflicts, user maintains control, Claude can help debug

### Production Access
```bash
# SSH tunnel for testing production container directly
ssh -L 3001:localhost:3001 hetzner -N &

# Health checks  
curl https://obsidian.quietloop.dev/health        # Production (via Caddy)
curl http://localhost:3001/health                 # Via tunnel (direct to container)
```


## Discord Bot Structure (`discord-server/`)
- **Architecture**: Direct Claude Code SDK integration with thread-based conversation management
- **Core Flow**: Discord message → Thread creation → Claude processing → Response formatting
- **Components**: `ThreadManager` for conversation context, Bun --watch for hot reload
- **Features**: Conversation memory, auto-threading, smart error handling, progress indicators

### Discord Bot Development Workflow
- **Primary**: `npm run dev` with Bun --watch for instant restarts
- **Monitoring**: `bot.log` file for Claude Code debugging via `tee`
- **Authentication**: Uses existing Claude CLI authentication
- **⚠️ Claude Code SDK**: Direct integration, no AI SDK wrapper complexity

## Legacy Components (Functional but Inactive)

### Android App (`ObsidianShare/`) - LEGACY
- Full React Native app with streaming chat interface
- Material Design 3 with custom drawer system
- Production API integration with session management

### Web Prototype (`web-prototype/`) - LEGACY
- Next.js chat interface with AI SDK hooks
- Professional UI for web-based interaction

## Production Infrastructure

### Clean Architecture ✅
**Separation of Concerns**: Infrastructure repo handles ONLY reverse proxy, this project manages its own containers.

```
obsidian.quietloop.dev (SSL: Let's Encrypt, DNS: Cloudflare Gray Cloud)
├── quietloop-caddy      # Reverse proxy (ports 80/443) - infra repo
├── obsidian-server      # Node.js + AI SDK + Claude Code CLI (port 3001) - THIS repo  
└── obsidian-redis       # Session store with 24h TTL (port 6379) - THIS repo
```

**Networks**: All services communicate via shared `quietloop-network` Docker network.

### Management Commands
```bash
# Infrastructure management (Caddy reverse proxy only)
ssh hetzner "cd /opt/quietloop-infra && docker compose ps"
ssh hetzner "cd /opt/quietloop-infra && docker compose restart caddy"
ssh hetzner "docker logs quietloop-caddy --tail 20"

# THIS project's services (managed independently)
ssh hetzner "cd ~/obsidian-bridge-server && docker compose ps"
ssh hetzner "cd ~/obsidian-bridge-server && docker compose restart"
ssh hetzner "docker logs obsidian-server --tail 20"
ssh hetzner "docker logs obsidian-redis --tail 20"

# Deployment (from local)
./deploy.sh  # Deploys THIS project's containers to shared network
```

### Repository Separation
```bash
# Infrastructure repository (Caddy routing only)
~/Projects/quietloop-hetzner-infra/
├── caddy/                     # Reverse proxy config
├── projects/obsidian-server/
│   └── obsidian-server.caddy  # ONLY routing: obsidian.quietloop.dev → obsidian-server:3001
└── scripts/deploy.sh          # Deploys Caddy

# THIS project repository (Application containers)
~/Projects/quietloop-claude-obsidian-server/
├── docker-compose.yml         # Container definitions + quietloop-network
├── deploy.sh                  # Deploys containers to shared network  
└── server/                    # Application code
```

### Critical Configuration
- **Server**: Hetzner VPS (49.13.63.69) 
- **DNS**: Must use Cloudflare ⚪ **DNS Only** (not 🟠 Proxied) for Let's Encrypt
- **SSL**: Let's Encrypt via Caddy, automatic renewal every 60 days
- **Data**: Redis persistence with Docker volumes, 24h session TTL
- **Network**: `quietloop-network` Docker network
- **Environment**: `CLAUDE_CODE_OAUTH_TOKEN` + `OBSIDIAN_VAULT_PATH` required

## Common Issues & Solutions

### Discord Bot Development Issues
**❌ "Redis connection error: getaddrinfo ENOTFOUND"**
- **Problem**: Redis container not running locally
- **Fix**: `docker run -d -p 6379:6379 --name redis-dev redis:alpine`
- **Check**: `docker ps | grep redis` should show running container
- **Note**: Discord bot REQUIRES Redis for thread management - no fallback mode

**❌ Bot doesn't respond to Discord messages**
- **Check Discord token**: Verify `DISCORD_BOT_TOKEN` in `.env.local`
- **Check channel ID**: Verify `DISCORD_INBOX_CHANNEL_ID` in `.env.local`
- **Check Claude auth**: Verify `CLAUDE_CODE_OAUTH_TOKEN` in `.env.local`

### SSL/DNS Issues
```bash
# Check DNS propagation
nslookup obsidian.quietloop.dev

# Check certificate status
curl -v https://obsidian.quietloop.dev/health

# Debug Caddy SSL issues
ssh hetzner "docker logs quietloop-caddy --tail 20 | grep -i acme"
```

### Development Issues
**❌ "Invalid settings: cwd: Working directory must exist"**
- Fix: `OBSIDIAN_VAULT_PATH=/Users/jonathan.glasmeyer/Projects/obsidian-vault`

**❌ SSH tunnel connection refused**
- Fix: `pkill -f "ssh.*3001:localhost:3001" && ssh -L 3001:localhost:3001 hetzner -N &`

**❌ Sessions not persisting**
- Check: Redis connection in `/health` endpoint
- Fix: Start local Redis or use in-memory fallback

**❌ Claude CLI authentication**
- Fix: `claude setup-token` → set `CLAUDE_CODE_OAUTH_TOKEN`

## Development Guidelines

### Component Organization (Android)
- **Separate components**: Extract to `ObsidianShare/components/`
- **PascalCase files**: `MessageBubble.tsx`, not inline definitions
- **TypeScript**: All `.tsx` files with proper typing


---

## Documentation Quick Reference

### 🏗️ Architecture & Setup
- **Server API & Configuration**: `docs/architecture/server-api.md`
- **Production Infrastructure**: `docs/architecture/infrastructure.md`

### 🚀 Active Development  
- **AI SDK v5 (All aspects)**: `docs/development/ai-sdk-v5-reference.md`
- **React Native Implementation**: `docs/development/react-native-guide.md`

### 🔧 Problem Solving
- **AI SDK Issues**: `docs/troubleshooting/ai-sdk-issues.md`
- **React Native Gestures**: `docs/troubleshooting/react-native-gestures.md`
- **Advanced React Native**: `docs/troubleshooting/react-native-advanced.md`

### 📚 Background Reference
- **Web Implementation Journey**: `docs/implementation-logs/web-prototype-history.md`
- **Mobile Implementation Journey**: `docs/implementation-logs/react-native-history.md`
- **Infrastructure Deployment**: `~/Projects/quietloop-hetzner-infra/README.md`

### 📋 Documentation Organization (September 2025)
- **Consolidated Structure**: Reduced 14 fragmented files to 9 focused references
- **Less Redundancy**: AI SDK v5 information unified from 4 → 1 comprehensive file  
- **Clear Purpose**: Each file has specific use case and target audience
- **Technical Details Preserved**: No information lost, better organized
