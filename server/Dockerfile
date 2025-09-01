FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache git openssh-client curl bash

# Create app directory
WORKDIR /app

# Use existing node user (UID 1000) - no need to rename, UID mapping is what matters

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directories for SSH keys and vault
RUN mkdir -p /home/node/.ssh /srv/claude-jobs/obsidian-vault && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

# Switch to node user and install Claude CLI as node user
USER node
RUN curl -sSL https://claude.ai/install.sh | bash

# Switch back to root to set up PATH for all users
USER root
RUN ln -s /home/node/.local/bin/claude /usr/local/bin/claude

# Switch to node user for runtime
USER node

EXPOSE 3001

CMD ["node", "index.js"]