# CLAUDE.md - Mobile Obsidian Vault Integration

## Project Overview
Mobile React Native app + bridge server for intelligently processing shared content into Obsidian vault using Claude Code CLI. Production-ready system with streaming AI chat interface.

## Current Status: Phase 4.2 Complete ✅
- ✅ **Production Server**: `obsidian.quietloop.dev` (Docker on Hetzner VPS)
- ✅ **Android App**: Full chat UI with session management (`ObsidianShare/`)
- ✅ **Web Prototype**: Professional chat interface (`web-prototype/`)
- 🔄 **Next**: Android Share Intent integration (Phase 4.3)

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
```bash
# Local bridge server
cd server && OBSIDIAN_VAULT_PATH=/Users/jonathan.glasmeyer/Projects/obsidian-vault CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_CODE_OAUTH_TOKEN node index.js

# Web prototype
cd web-prototype && pnpm run dev  # → http://localhost:3002

# Android development (Expo Go)
cd ObsidianShare && npx expo start  # → exp://192.168.178.147:8081
```

### Production Access
```bash
# SSH tunnel for testing production container directly
ssh -L 3001:localhost:3001 hetzner -N &

# Health checks  
curl https://obsidian.quietloop.dev/health        # Production (via Caddy)
curl http://localhost:3001/health                 # Via tunnel (direct to container)
```


## Android App Structure (`ObsidianShare/`)
- **Architecture**: Stack Navigator + Custom Drawer System (not standard RN Drawer)
- **Core Flow**: `App.tsx` → `ProgressiveDrawer` wrapping `StartNewScreen`/`ChatScreen`
- **Navigation**: 2 screens (StartNew, Chat) with custom drawer overlay via `DrawerProvider` context
- **Components**: 15 custom components (2030+ lines), including `ChatComponent`, `MessageBubble`, `CustomDrawerContent`
- **State**: `SessionsProvider` + `DrawerProvider` contexts with production API integration
- **UI**: Material Design 3 (React Native Paper) with custom drawer animations
- **Features**: Full-featured chat with session management, real-time AI streaming, Markdown rendering

### Android Development Workflow
- **Primary**: Expo Go on Android device (no installation needed)
- **Alternative**: Custom development build for native features
- **Debugging**: File-based logging (`metro-logs.txt`) for Claude Code inspection
  ```bash
  # User starts Metro with file logging (you don't - ask him to do it!)
  cd ObsidianShare && npm run start:logged  # → metro-logs.txt for Claude Code
  ```
- **⚠️ Android Only**: No iOS development in this project

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
