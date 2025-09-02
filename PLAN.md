# Mobile Obsidian Vault Integration - Implementation Plan

## Phase 4: React Native App (OPTIMIZED - Reusing Web Prototype)

### ✅ COMPLETED STEPS

#### Prerequisites: Shared Component Package ✅
Using shared-components package for session management (useSessions hook).

#### Step 4.1: Expo React Native Setup ✅
Expo app with TypeScript template created and running.

#### Step 4.3: Dependencies Installation ✅
AI SDK, polyfills, and shared components installed.

#### Step 4.4: Session API Integration ✅
Multi-session management with Redis persistence working.

#### Step 4.6: Official AI SDK Integration ✅
Official AI SDK v5 with DefaultChatTransport, proper polyfills, session persistence.

### ⏳ IN PROGRESS STEPS

#### Step 4.5: Component Architecture (PARTIALLY COMPLETE)
✅ Session-specific component keys, basic message rendering
✅ React key warnings fixed with unique message/part identifiers
⏳ Component extraction (MessageBubble, ChatInput) to separate files

#### Step 4.7: Core Chat Functionality ✅ COMPLETED
✅ Auto-scroll, pulsing animations, hardware keyboard, error handling
✅ **Modern header layout with 2025 safe area best practices**
✅ **Custom development build with native dependencies (react-native-safe-area-context)**
✅ **Professional ChatGPT-style UI with proper StatusBar handling**
✅ **M3-compliant sidebar with balanced spacing and world-class typography**
✅ **Markdown rendering fully implemented** - MarkdownMessage component with comprehensive styling
✅ **ChatGPT-style welcome screen** - App starts fresh without active chat, optimistic message display, automatic title generation from first message (30 char limit, real-time sidebar updates) ✅ COMPLETE

✅ **hairline beim composer nur wenn chat nach oben gescrollt (also invisible wenn ganz unten im chat)** - Conditional hairline with scroll position detection
✅ **keyboard wird sehr schnell dismissed beim scrollen** - Removed aggressive onScrollBeginDrag dismiss, using keyboardShouldPersistTaps="handled"

✅ **chat bubble hoehe meiner nachrichten is zu hoch** - Reduced user bubble paddingVertical from 12 to 4px, uniform 8px marginVertical
✅ **text groesse im chat etwas klein** - Increased chat text fontSize from 15 to 16px with proportional lineHeight

drawer:
- rename & delete chats


### 🚫 DEFERRED STEPS

#### Step 4.2: Share Intent Configuration (DEFERRED)
Focus on core chat functionality first.
- Android share intent handling with proper manifest configuration

## Phase 6: Deployment & Professional Polish

### Step 6.1: Security Setup - Claude User & Git Access
Setup dedicated user for Claude operations:
```bash
# Create dedicated user
sudo useradd -m -s /bin/bash claude
sudo mkdir -p /srv/claude-jobs
sudo chown claude:claude /srv/claude-jobs
sudo chmod 700 /srv/claude-jobs

# Generate repo-specific SSH key
sudo -u claude ssh-keygen -t ed25519 -f /home/claude/.ssh/id_ed25519_repo -N ''

# Setup SSH config for repo access
sudo -u claude tee /home/claude/.ssh/config << EOF
Host github.com
  IdentityFile ~/.ssh/id_ed25519_repo
  IdentitiesOnly yes
  StrictHostKeyChecking yes
EOF

# Pin GitHub's host keys
sudo -u claude ssh-keyscan github.com >> /home/claude/.ssh/known_hosts

# Git configuration for the claude user
sudo -u claude git config --global user.email "claude@yourdomain.com"
sudo -u claude git config --global user.name "Claude Bot"
sudo -u claude git config --global safe.directory /srv/claude-jobs/*
```

### Step 6.2: Vault Repository Setup
```bash
# Clone Obsidian vault with repo-specific key
cd /srv/claude-jobs
sudo -u claude GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_repo -o IdentitiesOnly=yes' git clone git@github.com:owner/obsidian-vault.git

# Set permissions
sudo chmod -R 700 /srv/claude-jobs/obsidian-vault
```

**Manual Step:** Add `/home/claude/.ssh/id_ed25519_repo.pub` as Deploy Key in GitHub repo settings with write permissions.

### Step 6.3: Server Deployment & Caddy Integration
- Deploy to Hetzner server via SSH:
  ```bash
  # Copy project files to server
  scp -r . user@hetzner-server:~/obsidian-bridge-server/

  # SSH into server and build
  ssh user@hetzner-server
  cd ~/obsidian-bridge-server
  docker-compose up -d
  ```
- Add obsidian service config to ../quietloop-cashflow/docker/caddy/Caddyfile:
  ```
  obsidian.yourdomain.com {
      reverse_proxy localhost:3001
  }
  ```
- Restart Caddy container in cashflow project
- Test obsidian.domain.com routing through Cloudflare

### Step 6.4: Mobile App Build & Deployment
```bash
# Production build with Expo
cd ObsidianShare
npx expo build:android --release-channel production

# Development testing
npx expo start --dev-client
```
- Generate signed APK via Expo Build Service
- Install on Pixel 9 via `adb install`
- Test share from various apps (Browser, Twitter, etc.)

### Step 6.5: Monitoring Setup
- Add basic logging to server
- Monitor Redis memory usage
- Track Claude API usage

### Step 6.6: Documentation
- Update README with setup instructions
- Document environment variables
- Add troubleshooting guide

## Testing Checklist

### Server Tests
- [ ] Health check endpoint works
- [ ] Session creation returns ID
- [ ] SSE stream connects
- [ ] Claude process spawns correctly
- [ ] Proposals parsed accurately
- [ ] Git operations complete

### App Tests
- [ ] Share intent received
- [ ] Content displayed correctly
- [ ] Stream updates live
- [ ] Confirmation works
- [ ] Error states handled

### Integration Tests
- [ ] Full flow: share → process → confirm → git
- [ ] Multiple content types work
- [ ] Session timeout handled
- [ ] Concurrent sessions supported

## Environment Variables

### Server (.env)
```
CLAUDE_CODE_OAUTH_TOKEN=<token>
OBSIDIAN_VAULT_PATH=/srv/claude-jobs/obsidian-vault
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=production
CLAUDE_USER=claude
```

### App (config.js)
```javascript
export const API_BASE_URL = 'https://obsidian.yourdomain.com';
```

## Debugging Commands

```bash
# Test Claude CLI directly
CLAUDE_CODE_OAUTH_TOKEN=xxx claude code --working-dir /vault

# Monitor server logs
journalctl -u obsidian-bridge -f

# Check Redis sessions
redis-cli KEYS "session:*"

# Test SSE endpoint
curl -N http://localhost:3000/api/session/test/stream

# Build APK debug version with Expo
cd ObsidianShare && npx expo build:android --type apk
```

## Success Criteria
1. ✅ Can share URL from any Android app
2. ✅ Claude proposes correct vault location
3. ✅ User can confirm/modify proposal
4. ✅ Changes committed and pushed to git
5. ✅ Full flow completes in <30 seconds
6. ✅ **Official AI SDK v5 Integration Complete** (Phase 4.6)
   - React Native chat app with DefaultChatTransport + expo/fetch
   - End-to-end message persistence with Redis
   - Clean AI SDK v5 parts format throughout

## Notes for Sonnet

### Phase 4 Optimization Benefits (Web Prototype Reuse)
- **70% Code Reduction**: Reuse session management, tool visualization, streaming UI
- **Consistent UX**: Same tool cards and interaction patterns across web + mobile
- **Production-Tested**: Backend API + components already proven in web prototype
- **Time Savings**: ~2-3 days instead of 4-5 days for full implementation

### Implementation Notes
- Start with shared component extraction from web-prototype
- Use Expo for simplified React Native development (vs vanilla RN)
- Focus on adapting existing UI components rather than rebuilding
- Test with simple text before complex URLs
- Handle Claude errors gracefully - show raw output if parsing fails

### Reusable Components Priority
1. **useSessions hook** - Session management logic (90% reusable)
2. **Tool visualization** - Cards, state management, rendering logic
3. **Streaming response** - Real-time text updates and markdown rendering
4. **API client** - Fetch wrapper with error handling
5. **Message UI** - Chat bubbles, avatars, timestamps
