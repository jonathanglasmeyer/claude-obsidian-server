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

# Switch to node user and install Claude CLI + Python dependencies as node user
USER node
RUN curl -sSL https://claude.ai/install.sh | bash

# Install Python dependencies in separate steps to avoid memory issues
RUN pip3 install --user --break-system-packages uv sqlite-vec pyyaml
RUN pip3 install --user --break-system-packages torch --index-url https://download.pytorch.org/whl/cpu
RUN pip3 install --user --break-system-packages sentence-transformers langchain-huggingface

# Switch back to root to set up PATH for all users
USER root
RUN ln -s /home/node/.local/bin/claude /usr/local/bin/claude && \
    ln -s /home/node/.local/bin/uv /usr/local/bin/uv

# Switch to node user for runtime
USER node

EXPOSE 3001

CMD ["node", "index.js"]