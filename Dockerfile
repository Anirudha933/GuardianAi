FROM node:22-slim

# ── System dependencies for Playwright/Chromium ───────────────
RUN apt-get update && apt-get install -y \
    curl bash git ca-certificates \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libpango-1.0-0 libasound2 libx11-6 libxcb1 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# ── Install OpenClaw ──────────────────────────────────────────
RUN npm install -g openclaw

WORKDIR /app

# ── Install Node dependencies ─────────────────────────────────
COPY package*.json ./
RUN npm install

# ── Install Playwright Chromium binary ────────────────────────
RUN npx playwright install chromium --with-deps

# ── Copy application source ───────────────────────────────────
COPY . .

# ── Build TypeScript ──────────────────────────────────────────
RUN npm run build

# ── Persistent data mount point ───────────────────────────────
VOLUME ["/data"]

EXPOSE 3000

# ── Start OpenClaw daemon ─────────────────────────────────────
CMD ["openclaw"]
