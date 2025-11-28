# === MULTI-STAGE DOCKERFILE FOR DISCORD BOT ===

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
    ocrmypdf \
    tesseract-ocr \
    tesseract-ocr-deu \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app directory and copy production dependencies from builder
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules

# Create directories for SSH keys and vault
RUN mkdir -p /home/node/.ssh /srv/claude-jobs/obsidian-vault && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

# Switch to node user for installations
USER node

# Install uv (Python package manager) - CACHED LAYER
RUN python3 -m pip install --user --break-system-packages uv

# === CLAUDE CODE INSTALLATION - CACHED LAYER ===
# This layer is cached and only rebuilt when Dockerfile changes
# Using official install script with timeout protection
RUN wget -q -O /tmp/claude-install.sh https://claude.ai/install.sh && \
    chmod +x /tmp/claude-install.sh && \
    timeout 120 bash /tmp/claude-install.sh || exit 1 && \
    rm -f /tmp/claude-install.sh

# Install markitdown for PDF/document processing
RUN python3 -m pip install --user --break-system-packages markitdown

# Copy application code AFTER CLI install (so code changes don't rebuild Claude CLI)
COPY . .

# Switch back to root to create symlinks, copy entrypoint, and fix PATH
USER root
RUN ln -sf /home/node/.local/bin/uv /usr/local/bin/uv && \
    ln -sf /home/node/.local/bin/claude /usr/local/bin/claude && \
    ln -sf /home/node/.local/bin/markitdown /usr/local/bin/markitdown

# Copy and set up entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Add ~/.local/bin to PATH for node user and set proper environment
USER node
ENV PATH="/home/node/.local/bin:$PATH"

EXPOSE 3001

# Health check - Discord bot will have /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["/entrypoint.sh"]