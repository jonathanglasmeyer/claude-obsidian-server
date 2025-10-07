# Claude Code Setup Guide

## Get Claude Code OAuth Token

### 1. Install Claude CLI

```bash
# macOS/Linux
brew install anthropics/claude/claude

# Or via npm
npm install -g @anthropic-ai/claude-cli
```

### 2. Authenticate

```bash
claude setup-token
```

This will:
1. Open your browser to authenticate
2. Generate an OAuth token
3. Save it to `~/.claude/credentials`

### 3. Get Your Token

**Option A: From CLI**
```bash
claude auth token
```

**Option B: From credentials file**
```bash
cat ~/.claude/credentials | jq -r '.oauth_token'
```

### 4. Add to .env

Copy the token to your `.env` file:

```bash
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-xxxxxxxxxxxxx...
```

## Verify Setup

Test that Claude Code can access your vault:

```bash
cd discord-server
npm run dev
```

Send a message in Discord like "list files in my vault" - if Claude responds, it's working.

## Troubleshooting

**Token expired or invalid:**
- Run `claude setup-token` again to refresh
- Copy new token to `.env`
- Restart bot

**Permission errors:**
- Ensure `OBSIDIAN_VAULT_PATH` points to your actual vault directory
- Check that the vault directory is readable

## Security

- Never commit your OAuth token to git
- The token grants full filesystem access to Claude Code
- Treat it like a password
