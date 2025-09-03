FROM node:18-slim

# Install system dependencies including Python for vector search
RUN apt-get update && apt-get install -y git openssh-client curl bash python3 python3-pip python3-dev gcc g++ libffi-dev && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Use existing node user (UID 1000) - no need to rename, UID mapping is what matters

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create directories for SSH keys and vault
RUN mkdir -p /home/node/.ssh /srv/claude-jobs/obsidian-vault && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

# Switch to node user for Claude CLI and Python dependencies installation  
USER node

# Install uv first (most stable, cacheable layer)
RUN pip3 install --user --break-system-packages uv

# Install Claude Code (separate layer for better debugging)
RUN curl -sSL https://claude.ai/install.sh -o /tmp/claude-install.sh && \
    bash /tmp/claude-install.sh && \
    rm /tmp/claude-install.sh

# Switch back to root to set up PATH for uv and Claude Code
USER root
RUN ln -s /home/node/.local/bin/uv /usr/local/bin/uv && \
    ln -s /home/node/.local/bin/claude /usr/local/bin/claude

# Note: Vector search dependencies will be managed by vault's pyproject.toml
# Runtime: (cd .claude/vector-search && uv sync) installs exactly what's needed

# Switch to node user for runtime
USER node

EXPOSE 3001

CMD ["node", "index.js"]