# ==============================================================================
# Production Dockerfile for HUY TECHNOLOGY AI Dispatcher Worker
# Target: Dell Precision M4800 (Ubuntu Server 24.04 LTS) / Coolify Deployment
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy root monorepo files
COPY package.json tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/dispatcher/ ./apps/dispatcher/

# Install dependencies and build monorepo packages
RUN npm install
RUN npm run build --workspace=@huy-ai/contracts
RUN npm run build --workspace=@huy-ai/config
RUN npm run build --workspace=@huy-ai/shared
RUN npm run build --workspace=@huy-ai/dispatcher

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV AI_PROVIDER_MODE=mock
ENV DISPATCHER_HEALTH_PORT=8080

RUN apk add --no-cache dumb-init

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts ./packages/contracts
COPY --from=builder /app/packages/config ./packages/config
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/dispatcher ./apps/dispatcher

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health || exit 1

EXPOSE 8080

USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/dispatcher/dist/index.js"]
