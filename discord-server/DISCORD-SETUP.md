# Discord Bot Setup Guide

## Discord Developer Portal Setup

### 1. Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name: `Obsidian Chat Bot` (or whatever you prefer)
4. Click "Create"

### 2. Configure Bot
1. Go to "Bot" tab in left sidebar
2. Click "Add Bot" → "Yes, do it!"
3. Configure bot settings:
   - **Username**: `obsidian-chat` (or your preference)
   - **Requires OAuth2 Code Grant**: ❌ Disabled
   - **Message Content Intent**: ✅ **REQUIRED** - Enable this!

### 3. Get Bot Token
1. In "Bot" tab, under "Token" section
2. Click "Reset Token" → Confirm
3. **Copy the token** - you'll need this for `.env` file
4. ⚠️ **NEVER share this token publicly**

### 4. Configure Bot Permissions
1. Go to "OAuth2" → "URL Generator" tab
2. **Scopes**: Check `bot`
3. **Bot Permissions**: Check these:
   - ✅ **View Channels**
   - ✅ **Send Messages**
   - ✅ **Send Messages in Threads**
   - ✅ **Use Slash Commands**
   - ✅ **Create Public Threads**
   - ✅ **Create Private Threads**
   - ✅ **Manage Threads**
   - ✅ **Read Message History**
   - ✅ **Add Reactions**

### 5. Invite Bot to Server
1. Copy the generated URL from step 4
2. Open URL in browser
3. Select your Discord server
4. Click "Authorize"
5. Complete captcha if prompted

### 6. Get Channel ID
1. In Discord, enable Developer Mode:
   - User Settings → Advanced → Developer Mode ✅
2. Right-click the channel you want the bot to monitor
3. Click "Copy ID"
4. This is your `DISCORD_INBOX_CHANNEL_ID`

## Environment Configuration

### Development (.env)
```bash
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_from_step_3
DISCORD_INBOX_CHANNEL_ID=your_channel_id_from_step_6

# Claude Configuration
CLAUDE_CODE_OAUTH_TOKEN=your_claude_oauth_token
OBSIDIAN_VAULT_PATH=/Users/your-username/Projects/obsidian-vault

# Development Settings
NODE_ENV=development
PORT=3001
REDIS_URL=redis://localhost:6379
REDIS_TTL_SECONDS=172800
```

### Production (.env in discord-server/)
```bash
# Copy from .env.production template
cp .env.production .env

# Edit with your actual values:
# - DISCORD_BOT_TOKEN (from step 3)
# - DISCORD_INBOX_CHANNEL_ID (from step 6)
# - CLAUDE_CODE_OAUTH_TOKEN (from claude CLI)
```

## Testing Bot Setup

### 1. Local Development Test
```bash
cd discord-server
npm run dev
```

**Look for these logs:**
```
🤖 Bot logged in as obsidian-chat#1234
📥 Monitoring channel: 1234567890123456789
🏥 Health server listening on port 3001
```

### 2. Discord Test
1. Go to your Discord channel
2. Send any message
3. Bot should:
   - Create a new thread
   - Respond with Claude's answer
   - Show processing indicators

### 3. Health Check
```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-18T...",
  "bot": {
    "connected": true,
    "user": "obsidian-chat#1234"
  },
  "redis": "connected",
  "threads": { "active": 0, "total": 0 }
}
```

## Troubleshooting

### Bot doesn't connect
- ❌ **Invalid token**: Check `DISCORD_BOT_TOKEN` in `.env`
- ❌ **Missing intents**: Ensure "Message Content Intent" is enabled
- ❌ **Network issues**: Check firewall/VPN

### Bot doesn't respond to messages
- ❌ **Wrong channel**: Check `DISCORD_INBOX_CHANNEL_ID` matches your test channel
- ❌ **Missing permissions**: Bot needs "Send Messages" and "Create Threads"
- ❌ **Claude auth**: Check `CLAUDE_CODE_OAUTH_TOKEN` is valid

### Bot creates threads but doesn't respond
- ❌ **Claude CLI issue**: Check Claude authentication with `claude auth status`
- ❌ **Redis connection**: Ensure Redis is running locally or via Docker

## Production Deployment

Once local testing works:

1. **Create production bot** (optional - separate bot for prod)
2. **Update production .env** with production tokens
3. **Deploy**: `./deploy.sh`
4. **Verify**: `curl https://obsidian.quietloop.dev/health`

Your Discord bot is now ready to use with Claude Code integration!
