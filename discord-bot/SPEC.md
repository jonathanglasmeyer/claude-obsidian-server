# Discord Bot Specification - Claude Code Direct Integration

## Overview
Discord bot with dedicated server optimized for Discord's constraints, using Claude Code SDK directly for reliable, complete responses. No streaming complexity, focused on thread-based session management.

## Architecture Philosophy

### Discord-First Design
- **Complete Responses**: Collect full Claude response before sending to Discord
- **No Streaming**: Discord can't do real streaming, edit-based simulation is poor UX
- **Thread Sessions**: Each Discord thread = isolated conversation context
- **Simple & Reliable**: Direct Claude Code SDK, minimal dependencies

### Core Components
```
Discord Bot Server (new, discord-optimized)
├── server.js              # Express server for Discord webhook/HTTP
├── discord-client.js      # Discord.js bot client
├── claude-direct.js       # Direct Claude Code SDK integration
├── thread-manager.js      # Thread ↔ conversation mapping
├── content-processor.js   # URL extraction, file handling
└── response-formatter.js  # Discord embeds, chunking, rate limits

Shared Infrastructure (unchanged)
├── Obsidian Vault (/srv/claude-jobs/obsidian-vault)
├── Claude Code CLI (authenticated)
└── Redis (optional, for thread state persistence)
```

## Technical Implementation

### 1. Claude Code SDK Direct Integration

**No AI SDK wrapper, direct usage:**
```js
import { query } from '@anthropic-ai/claude-code';

async function processWithClaude(userPrompt, threadId) {
  console.log(`Processing for thread ${threadId}: ${userPrompt}`);

  const stream = query({
    prompt: userPrompt,
    options: {
      cwd: '/srv/claude-jobs/obsidian-vault',
      // Let Claude decide tools, no restrictions for Discord use case
    }
  });

  // Collect complete response
  let fullResponse = '';
  let systemInfo = null;

  for await (const message of stream) {
    if (message.type === 'system') {
      systemInfo = message;
    }
    if (message.type === 'assistant') {
      // Claude Code SDK returns content array
      const textContent = message.message.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('');
      fullResponse += textContent;
    }
    if (message.type === 'result') {
      // Final result available
      return {
        success: true,
        response: message.result,
        usage: message.usage,
        duration: message.duration_ms
      };
    }
  }

  return { success: true, response: fullResponse };
}
```

### 2. Discord Bot Client

**Focused on inbox monitoring and thread management:**
```js
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

class DiscordObsidianBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    this.inboxChannelId = process.env.DISCORD_INBOX_CHANNEL_ID;
    this.threadManager = new ThreadManager();
  }

  async handleInboxMessage(message) {
    if (message.author.bot) return;
    if (message.channel.id !== this.inboxChannelId) return;

    // Create thread for this shared content
    const thread = await message.startThread({
      name: `Processing: ${this.truncateContent(message.content)}`,
      autoArchiveDuration: 1440 // 24 hours
    });

    // Show immediate feedback
    const processingEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🔄 Processing your content...')
      .setDescription('Claude is analyzing and adding to your vault')
      .setTimestamp();

    const statusMessage = await thread.send({ embeds: [processingEmbed] });

    try {
      // Process with Claude (blocking, complete response)
      const result = await this.processContent(message.content, thread.id);

      // Update with complete result
      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Processing Complete')
        .setDescription(this.formatResponse(result.response))
        .addFields([
          { name: 'Duration', value: `${result.duration}ms`, inline: true },
          { name: 'Tokens', value: `${result.usage?.totalTokens || 'N/A'}`, inline: true }
        ])
        .setTimestamp();

      await statusMessage.edit({ embeds: [successEmbed] });

    } catch (error) {
      // Show error
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Processing Failed')
        .setDescription(`Error: ${error.message}`)
        .setTimestamp();

      await statusMessage.edit({ embeds: [errorEmbed] });
    }
  }

  async processContent(content, threadId) {
    // Extract URLs, handle file attachments, etc.
    const processedContent = await this.contentProcessor.process(content);

    // Send to Claude Code SDK
    return await processWithClaude(processedContent, threadId);
  }
}
```

### 3. Thread-Based Session Management

**Simple mapping without complex session store:**
```js
class ThreadManager {
  constructor() {
    this.threadConversations = new Map(); // threadId → conversation history
    this.redis = null; // Optional persistence
  }

  async getConversation(threadId) {
    // Check memory first
    if (this.threadConversations.has(threadId)) {
      return this.threadConversations.get(threadId);
    }

    // Check Redis if available
    if (this.redis) {
      const stored = await this.redis.get(`thread:${threadId}`);
      if (stored) {
        const conversation = JSON.parse(stored);
        this.threadConversations.set(threadId, conversation);
        return conversation;
      }
    }

    // New conversation
    return [];
  }

  async addMessage(threadId, role, content) {
    const conversation = await this.getConversation(threadId);
    conversation.push({ role, content, timestamp: Date.now() });

    // Update memory
    this.threadConversations.set(threadId, conversation);

    // Persist to Redis if available
    if (this.redis) {
      await this.redis.setex(`thread:${threadId}`, 86400, JSON.stringify(conversation));
    }
  }
}
```

### 4. Content Processing Pipeline

**Handle different Discord content types:**
```js
class ContentProcessor {
  async process(discordMessage) {
    let content = discordMessage.content;
    const attachments = [];

    // Extract URLs for processing
    const urls = this.extractUrls(content);
    if (urls.length > 0) {
      content += `\n\nURLs to analyze: ${urls.join(', ')}`;
    }

    // Handle file attachments
    for (const attachment of discordMessage.attachments.values()) {
      if (this.isSupportedFile(attachment)) {
        // Download and include file content
        const fileContent = await this.processFile(attachment);
        attachments.push(fileContent);
      }
    }

    if (attachments.length > 0) {
      content += `\n\nAttached files:\n${attachments.join('\n')}`;
    }

    return content;
  }
}
```

## Simplified Server Structure

### API Endpoints (Minimal)
```js
// discord-server/server.js
app.post('/api/discord/process', async (req, res) => {
  const { content, threadId, userId } = req.body;

  try {
    const result = await processWithClaude(content, threadId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/discord/threads/:threadId', async (req, res) => {
  const conversation = await threadManager.getConversation(req.params.threadId);
  res.json({ threadId: req.params.threadId, conversation });
});
```

### Dependencies (Minimal)
```json
{
  "dependencies": {
    "@anthropic-ai/claude-code": "^1.0.115",
    "discord.js": "^14.x",
    "express": "^4.x",
    "redis": "^4.x"
  }
}
```

## Deployment Strategy

### Development Setup
```bash
# New discord-optimized server
mkdir discord-server
cd discord-server
npm init -y
npm install @anthropic-ai/claude-code discord.js express redis

# Environment
cat > .env << EOF
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id
DISCORD_INBOX_CHANNEL_ID=your_channel_id
OBSIDIAN_VAULT_PATH=/srv/claude-jobs/obsidian-vault
REDIS_URL=redis://localhost:6379
EOF
```

### Docker Integration
```yaml
# Add to existing docker-compose.yml
services:
  discord-server:
    build: ./discord-server
    container_name: discord-server
    environment:
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
      - DISCORD_INBOX_CHANNEL_ID=${DISCORD_INBOX_CHANNEL_ID}
      - OBSIDIAN_VAULT_PATH=/srv/claude-jobs/obsidian-vault
      - REDIS_URL=redis://redis:6379
    volumes:
      - /srv/claude-jobs:/srv/claude-jobs:rw
      - claude_config:/home/node/.claude-config:rw
    depends_on:
      - redis
    networks:
      - quietloop-network
```

## Benefits of This Approach

### Simplicity
- **Single responsibility**: Discord bot server does Discord things
- **Direct Claude SDK**: No AI SDK wrapper complexity
- **No streaming**: Collect complete responses, format for Discord
- **Minimal dependencies**: `discord.js` + `@anthropic-ai/claude-code` + basic Express

### Reliability
- **Tested path**: Claude Code SDK works (we verified)
- **No streaming bugs**: Complete responses are more reliable
- **Better Discord UX**: Single message edit vs multiple partial updates
- **Error handling**: Simpler error paths, clearer failure modes

### Discord-Optimized
- **Rate limit friendly**: Single message edit per request
- **2000 char handling**: Format complete response into chunks/embeds
- **Thread lifecycle**: Proper Discord thread management
- **Content types**: Handle URLs, files, images properly

## Implementation Phases

### Phase 1: MVP Discord Server
1. Basic Discord bot client
2. Claude Code SDK direct integration
3. Thread creation and response formatting
4. Simple in-memory conversation tracking

### Phase 2: Enhanced Features
1. Redis persistence for thread conversations
2. Advanced content processing (URLs, files)
3. Better error handling and rate limit management
4. Thread cleanup and management commands

### Phase 3: Production Deployment
1. Docker containerization
2. Production configuration
3. Monitoring and logging
4. Scale testing with Discord rate limits

## Migration Strategy

**Keep existing server** for web/mobile clients that benefit from streaming.

**Add new Discord server** optimized for Discord's constraints.

**Shared infrastructure**: Both use same vault, Claude CLI, Redis.

This gives you the best of both worlds - streaming for real clients, reliable complete responses for Discord.