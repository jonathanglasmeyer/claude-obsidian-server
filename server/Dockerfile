# === MULTI-STAGE DOCKERFILE FOR SIZE OPTIMIZATION ===

# === STAGE 1: BUILD DEPENDENCIES ===  
FROM node:18-slim as builder

# Install build dependencies only (not carried to final image)
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    curl \
    bash \
    python3 \
    python3-pip \
    python3-dev \
    gcc \
    g++ \
    libffi-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# === STAGE 2: RUNTIME IMAGE ===
FROM node:18-slim as runtime

# Install only runtime dependencies (minimal)
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    curl \
    bash \
    python3 \
    python3-pip \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app directory and copy production dependencies from builder
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules

# Copy application code (after .dockerignore filtering)
COPY . .

# Create directories for SSH keys and vault  
RUN mkdir -p /home/node/.ssh /srv/claude-jobs/obsidian-vault && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

# Switch to node user for installations
USER node

# Install uv (Python package manager)
RUN python3 -m pip install --user --break-system-packages uv

# === CLAUDE CODE INSTALLATION (FIXED) ===
# Alternative installation method to avoid curl issues
RUN wget -O /tmp/claude-install.sh https://claude.ai/install.sh && \
    chmod +x /tmp/claude-install.sh && \
    bash /tmp/claude-install.sh || { \
        echo "Claude install failed, installing via direct method..."; \
        mkdir -p /home/node/.local/bin; \
        wget -O /home/node/.local/bin/claude https://github.com/anthropics/claude-cli/releases/latest/download/claude-linux-x86_64 && \
        chmod +x /home/node/.local/bin/claude; \
    } && \
    rm -f /tmp/claude-install.sh

# Switch back to root to create symlinks
USER root
RUN ln -sf /home/node/.local/bin/uv /usr/local/bin/uv && \
    ln -sf /home/node/.local/bin/claude /usr/local/bin/claude

# Final runtime user
USER node

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "index.js"]