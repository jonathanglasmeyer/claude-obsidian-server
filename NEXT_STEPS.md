# Next Steps - Future Development

> **Status**: Phase 3.10 Complete ✅ - Bridge server with session persistence operational  
> **Current Focus**: Web prototype is production-ready, mobile development deferred

---

## BACKLOG: Phase 4+ (Future Development)

### Phase 4: Android App (Deferred)
**Status:** 📋 **BACKLOG** - Focus on web prototype polish first
**Rationale:** Web prototype needs significant UX improvements before mobile development.
**Dependencies:** Complete Phase 3.7 tool visualization and proper AI SDK components.

**Future Tasks:**
- React Native setup with share intent configuration
- Mobile-optimized chat UI using lessons from web prototype
- Share target functionality for URLs and text
- Offline queuing and session resumption

### Step 4.1: React Native Setup
```bash
npx react-native init ObsidianShare --skip-install
cd ObsidianShare
npm install
```

### Step 4.2: Share Intent Configuration
- Edit `android/app/src/main/AndroidManifest.xml`:
  - Add share intent filter for text/plain
  - Configure activity launch mode
- Test share target appears in Android share menu

### Step 4.3: Core Dependencies
```bash
npm install react-native-share-intent
npm install react-native-sse
npm install @react-navigation/native @react-navigation/stack
```

### Step 4.4: Share Handler Service
- Create `ShareHandlerService.js`
- Extract shared content from intent
- Queue if app not running

### Step 4.5: API Client
- Create `BridgeAPI.js` with fetch wrapper
- Implement session creation
- Setup SSE connection handler

### Step 4.6: Main UI Screen
- Create `ShareScreen.js` with:
  - Shared content preview
  - Loading spinner during processing
  - Claude response streaming display
  - Confirm/Cancel buttons

### Step 4.7: Streaming Components
- Create `StreamingText.js` for live token display
- Create `ProposalView.js` for file preview
- Handle markdown rendering

## Phase 5: Integration Testing (Day 3)

### Step 5.1: Local Testing Setup
- Clone Obsidian vault locally
- Configure server with vault path
- Start Redis and server

### Step 5.2: End-to-End Flow Test
1. Share URL from browser to app
2. Verify session creation
3. Check Claude proposal stream
4. Test confirmation flow
5. Verify git commit/push

### Step 5.3: Content Type Testing
- Test article URL processing
- Test plain text snippets
- Test Twitter/X post URLs
- Verify proper vault routing

### Step 5.4: Error Scenarios
- Test network disconnection
- Test Claude timeout
- Test invalid content
- Test git push failures

## Phase 6: Deployment & Polish (Day 4)

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

### Step 6.4: Android App Build
```bash
cd android
./gradlew assembleRelease
```
- Generate signed APK
- Install on Pixel 9
- Test share from various apps

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

# Build APK debug version
cd android && ./gradlew assembleDebug
```

## Success Criteria
1. ✅ Can share URL from any Android app
2. ✅ Claude proposes correct vault location
3. ✅ User can confirm/modify proposal
4. ✅ Changes committed and pushed to git
5. ✅ Full flow completes in <30 seconds

## Notes for Sonnet
- Start with Phase 1-2 (server) first - get CLI integration working
- Use console.log liberally during development
- Test with simple text before complex URLs
- Keep mobile UI minimal - focus on functionality
- Handle Claude errors gracefully - show raw output if parsing fails