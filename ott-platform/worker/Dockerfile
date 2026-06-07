# ─── Stage 1: deps ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# FFmpeg build dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    vips-dev

COPY package*.json ./
RUN npm ci --only=production && \
    cp -R node_modules /tmp/prod_modules && \
    npm ci

# ─── Stage 2: build ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache vips-dev python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── Stage 3: production ──────────────────────────────────────
FROM node:20-alpine AS production

# Install FFmpeg and runtime libs
RUN apk add --no-cache \
    ffmpeg \
    vips \
    && rm -rf /var/cache/apk/*

# Non-root user
RUN addgroup -g 1001 -S worker && \
    adduser  -S worker -u 1001 -G worker

WORKDIR /app

COPY --from=deps    /tmp/prod_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/package.json ./package.json

# Work directory for temp files
RUN mkdir -p /tmp/worker /var/log/worker && \
    chown -R worker:worker /tmp/worker /var/log/worker

USER worker

ENV NODE_ENV=production
ENV WORK_DIR=/tmp/worker
ENV LOG_LEVEL=info

EXPOSE 9091

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:9091/health || exit 1

CMD ["node", "dist/worker.js"]
