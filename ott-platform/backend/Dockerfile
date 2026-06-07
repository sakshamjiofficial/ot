# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    cp -R node_modules /tmp/prod_modules && \
    npm ci

# Stage 2: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: production
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app
COPY --from=deps    /tmp/prod_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/package.json ./package.json
RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads
USER nestjs
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health/live || exit 1
CMD ["node", "dist/main"]
