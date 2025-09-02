# CLAUDE.md - Mobile Obsidian Vault Integration

## Project Overview
Mobile React Native app that acts as a share target to intelligently process content into an Obsidian vault using Claude Code CLI. The app receives shared URLs/text, sends them to a bridge server that runs Claude Code CLI sessions, proposes vault organization, and executes git operations upon user confirmation.

**Status: Phase 3.10 Complete** - Bridge server with session persistence and production-ready web prototype.

## Architecture

**Components:**
- **Web Prototype (Next.js 14)** - Professional chat interface with tool visualization ✅
- **Mobile App (RN)** - Share target with streaming UI *(Phase 4)*
- **Bridge Server (Node.js)** - AI SDK v5 integration with Claude Code provider ✅
- **Session Store (Redis)** - Session persistence with 24h TTL ✅  
- **Obsidian Vault (Git)** - Target repository with existing CLAUDE.md rules ✅

**Current Flow:**
1. **Web Prototype**: Browser → `useChat()` → `/api/chat` → `streamText()` → Claude Code CLI ✅
2. **Session Management**: Redis persistence with 24h TTL + conversation history ✅
3. **Mobile Flow**: Share URL/text → RN app → Session API → Bridge server *(Phase 4)*
4. Server uses AI SDK with Claude Code provider (vault context)
5. Claude proposes file location/format via streaming
6. User confirms/modifies → Claude executes + commits to git

## Bridge Server

**For detailed technical documentation, see:** [`docs/server-api.md`](docs/server-api.md)

The bridge server provides AI-powered chat functionality using AI SDK v5 with Claude Code provider integration. Key features:

- **Direct streaming**: Real-time AI responses via Server-Sent Events
- **Session persistence**: Redis-backed chat history with 24h TTL
- **Vault integration**: Claude Code CLI operates in actual Obsidian vault
- **Performance-first**: Streaming prioritized, persistence happens async

### Quick Reference
```bash
# Main chat endpoint
POST /api/chat                  → AI SDK v5 streaming + session persistence

# Session management
GET  /api/chats                 → List all chat sessions
POST /api/chats                 → Create new chat session
DELETE /api/chats/:id          → Delete chat session

# Environment setup
CLAUDE_CODE_OAUTH_TOKEN        # From `claude setup-token`  
OBSIDIAN_VAULT_PATH           # Local vault directory
REDIS_URL                     # Optional, falls back to memory
```

## React Native App (Android-First)

### Target Platform
- **Primary Target**: Android (Pixel 9)
- **Share Intent**: Android SEND actions for URLs/text
- **Architecture**: Expo React Native with custom development build

### Structure
- **Share Extension** - Android Intent Filter for SEND actions  
- **StreamingText** - Live Claude response display with react-native-vercel-ai
- **ProposalView** - File preview with confirm/modify actions
- **API Client** - Session-persistent connection to bridge server

### Platform Integration
- **Android Intent Filter** for SEND actions (URLs, text content)
- **Session-based API** for robust message persistence  
- **Official AI SDK** with React Native polyfills ([Best Practices](./RN_AI_SDK_BEST_PRACTICES.md))
- **Metro Bundler** with package exports enabled
- **Custom Development Build** for native features

## Current Tech Stack

### Bridge Server (Production Ready)
- **AI Integration**: `ai-sdk-provider-claude-code` + Vercel AI SDK v5
- **Session Management**: Redis with 24h TTL + in-memory fallback
- **Streaming**: Native AI SDK v5 `streamText()` with message persistence
- **Vault Context**: Claude Code CLI operates in actual Obsidian vault directory
- **Infrastructure**: Docker + Redis on Hetzner VPS

### Web Prototype (Production Ready)
- **Frontend**: Next.js 14 + React 18 + AI SDK v5 + AI Elements
- **UI**: Professional chat with tool visualization, session management
- **Features**: Multi-session chats, conversation persistence, real-time streaming
- **Development**: Smart local/tunnel mode detection

## Current Capabilities

### Vault Intelligence ✅
- Reads actual `CLAUDE.md` rules from your vault
- Recognizes vault structure and content organization
- Uses custom Python scripts for complex queries (`uv run .claude/scripts/query-frontmatter.py`)
- Multilingual support (German/English tested)

### Chat Features ✅  
- **Multi-session management**: Create, rename, delete conversations
- **Session persistence**: Redis + localStorage with 24h TTL
- **Real-time streaming**: Token-by-token AI responses
- **Tool visualization**: File operations shown in collapsible UI cards
- **Professional UX**: AI Elements components, custom avatars, loading states

## Development Guidelines

### React Native App Component Organization (`ObsidianShare/`)
- **Separate Components:** Extract reusable components into individual files in `ObsidianShare/components/` directory
- **File Naming:** Use PascalCase for component files (e.g., `PulsingDots.tsx`, `MessageBubble.tsx`)
- **Clean Imports:** Import from dedicated component files instead of inline definitions in `App.tsx`
- **Single Responsibility:** Each component file should contain one primary component
- **TypeScript:** All component files should use `.tsx` extension with proper typing

### React Native Code Organization Pattern
```typescript
// ❌ Bad: Inline component definitions in App.tsx
function App() {
  function PulsingDots() { /* animation logic */ }
  function MessageBubble() { /* message rendering */ }
  return <View>...</View>;
}

// ✅ Good: Separate component files
// ObsidianShare/components/PulsingDots.tsx
export function PulsingDots() { /* animation logic */ }

// ObsidianShare/components/MessageBubble.tsx  
export function MessageBubble() { /* message rendering */ }

// ObsidianShare/App.tsx
import { PulsingDots } from './components/PulsingDots';
import { MessageBubble } from './components/MessageBubble';
function App() {
  return <View>...</View>;
}
```

**Note:** This pattern applies specifically to the React Native mobile app. Web prototype and server components follow their own organization patterns.

## Development Workflow

### Local Development (Recommended)
```bash
# Start local bridge server
cd server
OBSIDIAN_VAULT_PATH=/Users/jonathan.glasmeyer/Projects/obsidian-vault \
CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_CODE_OAUTH_TOKEN \
node index.js

# Start web prototype (separate terminal)
cd web-prototype
pnpm run dev
# → http://localhost:3002
```

### Production Testing via SSH Tunnel
```bash
# Start SSH tunnel to production server
ssh -L 3001:localhost:3001 hetzner -N &

# Test tunnel health
curl -s http://localhost:3001/health

# Start web prototype against tunnel
cd web-prototype && pnpm run dev
```

### Quick Health Checks
```bash
# Local server
curl -s http://localhost:3000/health

# Production via tunnel
curl -s http://localhost:3001/health

# Test AI streaming
curl -X POST http://localhost:3000/api/chat?chatId=test \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Test session management
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat"}'
```

### Mobile App Development

**Recommended Development Setup (Expo Go):**
```bash
# 1. Install Expo Go app from Play Store on your device

# 2. Enable ADB over WiFi (optional, for debugging)
adb tcpip 5555
arp -a | grep -i "192.168.178"  # Find your device IP
adb connect [DEVICE_IP]:5555    # Usually 192.168.178.162

# 3. Start Expo development server
cd ObsidianShare
npx expo start

# 4. In Expo Go app: "Enter URL manually" 
# Enter: exp://192.168.178.147:8081
# (Or scan QR code from terminal/browser at localhost:8081)
```

**Development Benefits:**
- ✅ **No app installation needed** - runs directly in Expo Go
- ✅ **Full Hot Reload** over WiFi
- ✅ **Automatic IP detection** via `Constants.experienceUrl`
- ✅ **Easy setup** - just install Expo Go from Play Store
- ✅ **Native debugging**: `adb exec-out screencap -p > /tmp/screenshot.png`

**IP Detection Logic:**
- **Development builds**: Uses `Constants.debuggerHost`  
- **Expo Go**: Extracts IP from `Constants.experienceUrl` (exp://IP:8081)
- **No fallbacks**: Fails cleanly if no IP detected

**Alternative: Development Builds** (more complex):
```bash
# Only if you need native modules or custom builds
npx expo install expo-dev-client
npx expo run:android --dev-client
```

## Common Issues & Solutions

**❌ "Invalid settings: cwd: Working directory must exist"**
- **Cause**: Wrong vault path for local development
- **Fix**: Use local vault path: `OBSIDIAN_VAULT_PATH=/Users/jonathan.glasmeyer/Projects/obsidian-vault`

**❌ Requests timeout or connection refused**
- **Cause**: SSH tunnel died or port conflict
- **Fix**: Restart tunnel: `pkill -f "ssh.*3001:localhost:3001" && ssh -L 3001:localhost:3001 hetzner -N &`

**❌ Sessions not persisting**
- **Check**: Redis connection in health endpoint response
- **Fix**: Start Redis locally: `redis-server` or use Docker: `docker run -p 6379:6379 redis`
- **Fallback**: Server automatically uses in-memory storage if Redis unavailable

**❌ "Claude CLI not found" or authentication errors**
- **Check**: `claude --version && claude auth status`
- **Fix**: Run `claude setup-token` and set `CLAUDE_CODE_OAUTH_TOKEN` env var

## Infrastructure

- **Production**: Hetzner VPS with Docker Compose (Node.js + Redis)
- **Development**: Local with SSH tunnel to production  
- **Security**: Isolated `claude` user, SSH keys, container isolation

## Current Status ✅

**Phase 3.10 Complete**:
- ✅ Bridge server with Redis session persistence
- ✅ Professional web prototype with tool visualization
- ✅ Production deployment on Hetzner with SSH tunnel access
- ✅ Multi-session chat with conversation history
- ✅ Real-time AI streaming with vault intelligence
- ✅ Zero-conversion AI SDK v5 pipeline end-to-end

**Ready for**: Phase 4 mobile app development with proven session-persistent chat API

**Next Phase**: React Native app using session-persistent API with proven backend architecture.

---

> **Reference Files:**
> - `PLAN.md` - Current status and development workflow
> - `IMPLEMENTATION_HISTORY.md` - Detailed technical logs (Phase 0-3.10)  
> - `NEXT_STEPS.md` - Phase 4+ future development plans