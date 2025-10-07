#!/bin/bash
set -e

# Sync discord-server/.env secrets to GitHub repository
# Requires: gh CLI (brew install gh)

echo "🔐 Syncing discord-server/.env to GitHub Secrets..."
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ gh CLI is not installed"
    echo "Install: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

# Check if discord-server/.env exists
if [ ! -f "discord-server/.env" ]; then
    echo "❌ discord-server/.env not found"
    echo "Create it first with your production secrets"
    exit 1
fi

# Get repository (auto-detect from git remote)
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    echo "❌ Could not detect GitHub repository"
    echo "Make sure you're in a git repository with a GitHub remote"
    exit 1
fi

echo "📦 Repository: $REPO"
echo ""

# Parse discord-server/.env and set secrets
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^# ]] && continue

    # Remove quotes from value
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    echo "🔑 Setting secret: $key"
    echo "$value" | gh secret set "$key" --repo "$REPO"
done < discord-server/.env

echo ""
echo "✅ All discord-server/.env secrets synced to GitHub!"
echo ""

# Auto-detect SSH config from 'hetzner' alias
echo "🔍 Auto-detecting Hetzner SSH config..."
if ssh -G hetzner &>/dev/null; then
    HETZNER_USER=$(ssh -G hetzner 2>/dev/null | grep "^user " | awk '{print $2}')
    HETZNER_HOST=$(ssh -G hetzner 2>/dev/null | grep "^hostname " | awk '{print $2}')
    SSH_KEY_PATH=$(ssh -G hetzner 2>/dev/null | grep "^identityfile " | head -1 | awk '{print $2}')

    # Expand ~ in path
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

    echo "📦 Detected from SSH config:"
    echo "   Host: $HETZNER_HOST"
    echo "   User: $HETZNER_USER"
    echo "   Key:  $SSH_KEY_PATH"
    echo ""

    # Set Hetzner secrets
    if [ -f "$SSH_KEY_PATH" ]; then
        echo "🔑 Setting HETZNER_SSH_KEY..."
        cat "$SSH_KEY_PATH" | gh secret set HETZNER_SSH_KEY --repo "$REPO"

        echo "🔑 Setting HETZNER_HOST..."
        echo "$HETZNER_HOST" | gh secret set HETZNER_HOST --repo "$REPO"

        echo "🔑 Setting HETZNER_USER..."
        echo "$HETZNER_USER" | gh secret set HETZNER_USER --repo "$REPO"

        echo ""
        echo "✅ All Hetzner SSH secrets synced!"
    else
        echo "⚠️  SSH key not found at: $SSH_KEY_PATH"
        echo "Set manually:"
        echo "   cat ~/.ssh/your_key | gh secret set HETZNER_SSH_KEY --repo $REPO"
    fi
else
    echo "⚠️  'hetzner' SSH alias not found in ~/.ssh/config"
    echo ""
    echo "📋 Set Hetzner secrets manually:"
    echo "   cat ~/.ssh/your_deploy_key | gh secret set HETZNER_SSH_KEY --repo $REPO"
    echo "   echo 'your.server.ip' | gh secret set HETZNER_HOST --repo $REPO"
    echo "   echo 'root' | gh secret set HETZNER_USER --repo $REPO"
fi

echo ""
echo "🔍 Validating all required secrets..."
echo ""

# Required secrets for Discord Bot deployment
REQUIRED_SECRETS=(
    "DISCORD_BOT_TOKEN"
    "DISCORD_INBOX_CHANNEL_ID"
    "CLAUDE_CODE_OAUTH_TOKEN"
    "HETZNER_SSH_KEY"
    "HETZNER_HOST"
    "HETZNER_USER"
)

# Get list of existing secrets
EXISTING_SECRETS=$(gh secret list --repo "$REPO" 2>/dev/null | awk '{print $1}')

# Check each required secret
MISSING_SECRETS=()
for secret in "${REQUIRED_SECRETS[@]}"; do
    if echo "$EXISTING_SECRETS" | grep -q "^${secret}$"; then
        echo "✅ $secret"
    else
        echo "❌ $secret (MISSING)"
        MISSING_SECRETS+=("$secret")
    fi
done

echo ""
if [ ${#MISSING_SECRETS[@]} -eq 0 ]; then
    echo "🎉 All required secrets are configured!"
    echo "✅ Ready for automated deployment via GitHub Actions"
else
    echo "⚠️  Missing ${#MISSING_SECRETS[@]} secret(s):"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "   - $secret"
    done
    echo ""
    echo "Run this script again or set missing secrets manually"
    exit 1
fi
