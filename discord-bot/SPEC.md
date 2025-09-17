# Discord Bot Integration Specification

## Overview
Discord bot frontend for the existing Obsidian bridge server, providing thread-based session management for shared content processing.

## Architecture

### Core Flow
1. **Inbox Channel**: Users share content to designated `#obsidian-inbox` channel
2. **Auto-Threading**: Bot creates thread for each shared item
3. **Session Mapping**: Each thread maps to a unique session in existing bridge server
4. **AI Processing**: Leverages existing Claude Code CLI backend via bridge server API

### Components
```
Discord Bot
├── Bot Client (discord.js)
├── Session Manager (threadId ↔ sessionId)
├── Bridge Server Client (HTTP to existing API)
└── Content Processor (message formatting)

Existing Infrastructure (unchanged)
├── Bridge Server (server/)
├── Claude Code CLI
└── Redis Sessions
```

## Session Management

### Thread-Based Sessions
- **Mapping**: `threadId` → `sessionId` (stored in Redis or memory)
- **Persistence**: Thread history = conversation history
- **Isolation**: Each shared item gets its own thread/session
- **Cleanup**: Auto-archive threads after 24h inactivity

### Session Lifecycle
```js
// New share in inbox
message in #obsidian-inbox
  → createThread(content_preview)
  → generateSessionId()
  → map threadId ↔ sessionId
  → processContent(sessionId, content)
  → streamResponse(thread)
```

## Discord Bot Features

### Core Functionality
- **Inbox Monitoring**: Listen for messages in configured inbox channel
- **Thread Creation**: Auto-create threads with meaningful titles
- **Content Processing**: Forward shared content to bridge server
- **Response Streaming**: Edit messages to simulate streaming (within rate limits)
- **Session Persistence**: Maintain thread ↔ session mapping

### Message Handling
- **Content Types**: Text, URLs, files, images
- **Response Format**: Discord embeds for structured output
- **Rate Limit Compliance**: Batch updates, edit instead of multiple sends
- **Error Handling**: Graceful failures with user feedback

### Thread Management
- **Naming**: `"Shared: {content_preview}..."` or `"Processing: {timestamp}"`
- **Auto-Archive**: 24h after last activity
- **Thread Limit**: Discord's 1000 active threads per guild
- **Cleanup**: Archive old threads periodically

## Technical Implementation

### Discord.js Setup
```js
const { Client, GatewayIntentBits, ThreadAutoArchiveDuration } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
```

### Rate Limit Strategy
- **Message Updates**: Edit single message instead of multiple sends
- **Batching**: Collect AI chunks, update every 1-2 seconds
- **Progress Indicators**: Use Discord embeds with loading states
- **Fallback**: Queue responses if hitting limits

### Bridge Server Integration
```js
// Reuse existing API endpoints
POST /api/sessions           // Create new session
POST /api/sessions/:id/chat  // Send message (streaming)
GET  /api/sessions/:id       // Get session history
```

### Error Scenarios
- **Bridge Server Down**: Graceful degradation, retry logic
- **Rate Limits Hit**: Queue messages, inform user of delay
- **Thread Creation Failed**: Fallback to direct channel response
- **Session Lost**: Create new session, inform user

## Configuration

### Environment Variables
```env
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
DISCORD_INBOX_CHANNEL_ID=...
BRIDGE_SERVER_URL=http://localhost:3001
API_SECRET_KEY=...
```

### Discord Bot Permissions
- Read Messages
- Send Messages
- Create Public Threads
- Send Messages in Threads
- Embed Links
- Attach Files

## Deployment

### Development
```bash
cd discord-bot
npm install
npm run dev  # Connect to local bridge server
```

### Production
```bash
# Add to existing docker-compose.yml
services:
  discord-bot:
    build: ./discord-bot
    environment:
      - BRIDGE_SERVER_URL=http://obsidian-server:3001
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
    networks:
      - quietloop-network
```

## User Experience

### Sharing Flow
1. User pastes content in `#obsidian-inbox`
2. Bot creates thread: "Processing: [content preview]"
3. Bot processes via Claude Code CLI
4. Response streams in thread as edited message
5. Thread auto-archives after 24h

### Example Interaction
```
#obsidian-inbox:
User: "https://example.com/article - please analyze and add to my research notes"

Bot creates thread: "Shared: https://example.com/article - please analyze..."

In thread:
Bot: 🔄 Processing your content...
Bot: ✅ **Analysis Complete**

     Added to your vault: `Research/Web Articles/Example Analysis.md`

     **Key insights:**
     - Main argument about X
     - Supporting evidence for Y
     - Connected to existing note: [[Related Topic]]
```

## Limitations & Considerations

### Discord Constraints
- 2000 character message limit
- File size limits (8MB standard, 25MB Nitro)
- Rate limiting (manageable for this use case)
- No real-time streaming (edit-based simulation)

### Security
- Bot token protection
- Channel access control
- Same API key validation as existing system
- No additional auth needed (Discord handles user identity)

### Scalability
- Thread limit: 1000 active per guild
- Rate limits: 5 messages/5s sufficient for AI responses
- Session storage: Reuse existing Redis infrastructure

## Future Enhancements

### Phase 1 (MVP)
- Inbox monitoring + thread creation
- Basic content processing
- Response streaming via message edits

### Phase 2
- Slash commands for advanced features
- Multiple inbox channels
- Custom thread naming patterns

### Phase 3
- Guild-wide configuration
- User preferences
- Advanced content type handling