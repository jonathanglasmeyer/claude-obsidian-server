# Mobile Obsidian Vault Integration - Implementation Plan

## Phase 4: React Native App (OPTIMIZED - Reusing Web Prototype) 

### Prerequisites: Shared Component Package
Extract reusable components from production-ready web prototype:

```bash
# Create shared package structure
mkdir -p packages/shared-components/{components,hooks,types,api}

# Extract from web-prototype:
# - hooks/use-sessions.ts → packages/shared-components/hooks/
# - components/{tool.tsx,response.tsx,message.tsx} → packages/shared-components/components/
# - Session management + API client logic
```

### Step 4.1: Expo React Native Setup (Simplified)
```bash
npx create-expo-app@latest ObsidianShare --template blank-typescript
cd ObsidianShare
npx expo install expo-sharing expo-intent-launcher
```

### Step 4.2: Share Intent Configuration  
- Configure `app.json` for share intents (Android + iOS)
- Add share intent handling in `App.tsx`
- Test share target appears in system share menu

### Step 4.3: Shared Dependencies Installation
```bash
npm install ../packages/shared-components
npm install @react-native-async-storage/async-storage
npm install react-native-markdown-display
```

### Step 4.4: Session API Integration (REUSED)
- Import `useSessions` hook from shared package
- Adapt API client for React Native fetch
- Session persistence works identically to web prototype

### Step 4.5: Iterative Architecture Migration to Web Prototype Pattern ⭐ CURRENT PHASE
**Goal**: Transform React Native monolithic structure into professional Web Prototype architecture

#### **4.5.1: Component Extraction (Phase 1 - Foundation) ✅ DONE**
```bash
# Current Status: Key duplication fixed, basic ChatComponent pattern implemented
- ✅ ChatComponent separated with session-specific keys
- ✅ `key={activeSessionId}` pattern implemented
- ✅ Basic message rendering working
```

#### **4.5.2: File Structure Refactor (Phase 2 - Organization)**
```bash
mkdir -p components/{chat,sidebar,message,tool,ui}

# Extract components to match Web Prototype:
# App.tsx → components/ChatComponent.tsx (main logic)
# App.tsx → components/Sidebar.tsx (session management)
# MessageBubble → components/message/MessageBubble.tsx
```

**Tasks:**
- Extract ChatComponent to separate file with proper TypeScript interfaces
- Extract Sidebar to separate component with session management
- Create component index files for clean imports
- Maintain current functionality during extraction

#### **4.5.3: Message Architecture Upgrade (Phase 3 - Core Features)**
**Port Web Prototype's sophisticated message system:**

```typescript
// Target: Match web-prototype/components/message.tsx structure
export function MessageRenderer({ message, parts }) {
  return (
    <Message role={message.role}>
      <MessageAvatar role={message.role} />
      <MessageContent>
        {parts.map((part, index) => renderMessagePart(part, `${message.id}-${index}`))}
      </MessageContent>
    </Message>
  );
}

const renderMessagePart = (part: any, key: string) => {
  switch (part.type) {
    case 'text': return <Response key={key}>{part.text}</Response>;
    case 'tool-Read':
    case 'tool-Write':
    case 'tool-Edit':
    case 'tool-Bash':
    case 'tool-Grep': 
      return <ToolVisualization key={key} tool={part} />;
  }
};
```

**Tasks:**
- Replace simple MessageBubble with MessageRenderer component
- Add message parts parsing (text, tools, etc.)  
- Implement Response component for streaming text
- Add proper TypeScript interfaces for message types

#### **4.5.4: Tool Visualization System (Phase 4 - Advanced Features)**
**Port complete tool visualization from web-prototype:**

```typescript
// components/tool/ToolVisualization.tsx
export function ToolVisualization({ tool }: { tool: ToolUIPart }) {
  const toolName = tool.type.replace('tool-', '');
  
  return (
    <ToolCard>
      <ToolHeader type={toolName} state={tool.state} />
      <Collapsible>
        <ToolContent>
          {tool.input && <ToolInput input={tool.input} />}
          {tool.output && <ToolOutput output={tool.output} errorText={tool.errorText} />}
        </ToolContent>
      </Collapsible>
    </ToolCard>
  );
}
```

**Tasks:**
- Port Tool, ToolHeader, ToolContent, ToolInput, ToolOutput components
- Implement collapsible tool cards with React Native animations
- Add tool state management (loading, success, error states)
- Support all Claude Code tool types (Read, Write, Edit, Bash, Grep, Glob)

#### **4.5.5: Professional UI Components (Phase 5 - Polish)**
**Upgrade to Web Prototype's professional components:**

```typescript
// components/ui/ directory structure matching web prototype
├── Button.tsx          // Professional button styles
├── Input.tsx           // Form inputs with proper styling  
├── Avatar.tsx          // User/Assistant avatars
├── Badge.tsx           // Status badges and labels
├── Collapsible.tsx     // Tool card collapsing
└── Select.tsx          // Dropdowns and selectors
```

**Tasks:**
- Port all UI components from web-prototype/components/ui/
- Implement proper styling system matching web design
- Add dark mode support preparation
- Ensure accessibility compliance (React Native Accessibility)

#### **4.5.6: Advanced Session Management (Phase 6 - Feature Parity)**
**Upgrade sidebar to match Web Prototype functionality:**

```typescript
// components/sidebar/SessionSidebar.tsx
interface SessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionCreate: () => void;
  onSessionDelete: (sessionId: string) => void;  // ✅ Add
  onSessionRename: (sessionId: string, title: string) => void;  // ✅ Add
  isCollapsed?: boolean;
}
```

**Tasks:**
- Add session renaming functionality (inline editing)
- Add session deletion with confirmation
- Implement session search/filter
- Add session creation with custom titles
- Port date formatting (formatDistanceToNow from date-fns)

### Step 4.6: Advanced Features Integration (Phase 7 - Professional Polish)

#### **4.6.1: Streaming & Real-time Updates**
- Port web prototype's sophisticated streaming handling
- Add proper loading states and error handling
- Implement optimistic UI updates

#### **4.6.2: Performance Optimization**
- Add React.memo for expensive components  
- Implement lazy loading for tool components
- Add virtualization for long message lists

#### **4.6.3: Share Intent Integration**
```typescript
// Platform-specific share handling
interface ShareData {
  url?: string;
  text?: string;
  title?: string;
}

export function handleShareIntent(data: ShareData) {
  // Create new session with shared content
  // Pre-populate input field
  // Auto-send if configured
}
```

### Step 4.7: Production Readiness (Phase 8 - Deployment Prep)

#### **4.7.1: Error Boundaries & Monitoring**
- Add comprehensive error boundaries
- Implement crash reporting (Sentry integration)
- Add performance monitoring

#### **4.7.2: Testing Framework**
```bash
# Component testing setup
npm install --save-dev @testing-library/react-native jest
mkdir -p __tests__/{components,hooks,utils}

# Test coverage targets:
- Component rendering ✅ 90%+
- Message parsing ✅ 95%+
- Session management ✅ 90%+
- Tool visualization ✅ 85%+
```

#### **4.7.3: Platform Integration Final**
- Android share intent handling with proper manifest configuration
- iOS share extension (if needed)
- Deep linking support for session URLs
- Background processing for large content

## Phase 5: Quality Assurance & Integration Testing

### Step 5.1: Component Integration Testing
- Cross-component communication validation
- State management flow testing  
- Error propagation testing
- Performance benchmarking

### Step 5.2: End-to-End Flow Testing  
1. Share URL from browser to app ✅
2. Verify professional UI renders correctly ✅
3. Test tool visualization for all Claude Code tools ✅
4. Verify session management (create, rename, delete) ✅
5. Test streaming responses with complex tool outputs ✅

### Step 5.3: Mobile-Specific Testing
- Touch interaction testing (swipe, tap, long press)
- Keyboard behavior and input handling
- Screen rotation and responsive design
- Memory usage and performance on low-end devices

### Step 5.4: Professional UI Validation
- Design consistency with Web Prototype ✅
- Accessibility compliance (screen readers, contrast) ✅  
- Animation performance and smoothness ✅
- Dark mode compatibility ✅

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
