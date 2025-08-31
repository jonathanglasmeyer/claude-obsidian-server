FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache git openssh-client curl bash

# Create app directory
WORKDIR /app

# Create claude user matching host system
RUN addgroup -g 1001 claude && \
    adduser -u 1001 -G claude -s /bin/bash -D claude

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directories for SSH keys and vault
RUN mkdir -p /home/claude/.ssh && \
    chown -R claude:claude /home/claude/.ssh && \
    chmod 700 /home/claude/.ssh

# Switch to claude user and install Claude CLI as claude user
USER claude
RUN curl -sSL https://claude.ai/install.sh | bash

# Switch back to root to set up PATH for all users
USER root
RUN ln -s /home/claude/.local/bin/claude /usr/local/bin/claude

# Switch back to claude user for runtime
USER claude

EXPOSE 3001

CMD ["node", "index.js"]