# Development Setup - Simple Approach

The web prototype always connects to `localhost:3001`. You choose which server runs there:

## Two Simple Options

### 🚇 Option 1: SSH Tunnel (Recommended)
Connect to production server with real Obsidian vault via SSH tunnel.

```bash
# Terminal 1: Start SSH tunnel
ssh -L 3001:localhost:3001 hetzner -N

# Terminal 2: Start web prototype
cd web-prototype && pnpm run dev
```

**Benefits:**
- ✅ Real Obsidian vault with full content
- ✅ Production environment
- ✅ No local setup required

### 🏠 Option 2: Local Server  
Run bridge server locally with local vault.

```bash  
# Terminal 1: Start local bridge server
cd server && OBSIDIAN_VAULT_PATH=/path/to/local/vault CLAUDE_CODE_OAUTH_TOKEN=$TOKEN npm start

# Terminal 2: Start web prototype  
cd web-prototype && pnpm run dev
```

**Benefits:**
- ✅ Faster development cycle
- ✅ Local debugging
- ❌ Requires local vault setup

## Usage Examples

### Daily Development (Recommended)
```bash
# Start SSH tunnel (in background)
ssh -L 3001:localhost:3001 hetzner -N &

# Start web prototype
cd web-prototype
pnpm run dev  # Uses tunnel mode by default
```

### Local Testing
```bash
# Terminal 1: Local server (port 3003)
cd server && PORT=3003 OBSIDIAN_VAULT_PATH=/path/to/vault CLAUDE_CODE_OAUTH_TOKEN=$TOKEN npm start

# Terminal 2: Web prototype  
cd web-prototype && pnpm run dev:local
```

### Explicit Mode Selection
```bash
# Force tunnel mode
pnpm run dev:tunnel

# Force local mode
pnpm run dev:local
```

## Configuration

Modes are configured via environment variables in `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev --port 3002",
    "dev:local": "LOCAL_MODE=true next dev --port 3002", 
    "dev:tunnel": "TUNNEL_MODE=true next dev --port 3002"
  }
}
```

## Health Checks

Test your connections:

```bash
# SSH Tunnel (production)
curl -s http://localhost:3001/health

# Local server
curl -s http://localhost:3003/health
```

**Expected Response:**
```json
{"status":"healthy","timestamp":"...","version":"1.0.0","redis":true}
```

## Troubleshooting

### SSH Tunnel Issues
```bash
# Kill existing tunnels
pkill -f "ssh.*3001:localhost:3001"

# Check port usage
lsof -i :3001

# Restart tunnel
ssh -L 3001:localhost:3001 hetzner -N
```

### Local Server Issues
```bash
# Check if vault path exists
ls -la $OBSIDIAN_VAULT_PATH

# Verify Claude token
echo $CLAUDE_CODE_OAUTH_TOKEN | head -c 20  # Should show token prefix
```

### Mode Detection Debug
Check Next.js console logs for mode detection:
```
🏠 LOCAL MODE: Using local bridge server
🚇 TUNNEL MODE: Using SSH tunnel to production
```