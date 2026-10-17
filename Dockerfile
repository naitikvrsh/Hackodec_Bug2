# ====================================================================
# AegisGuard: Multi-Stage Production Dockerfile
# Serves both the React client SPA and Express REST API as one service
# ====================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package and workspace configuration
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies across all workspaces
RUN npm ci

# Copy full repository source code
COPY server/ ./server/
COPY client/ ./client/
COPY data/ ./data/

# Build server and client
RUN npm run build:server
RUN npm run build:client

# ====================================================================
# Runner Stage: Lightweight runtime image
# ====================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy root and server package files for production dependencies
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built server and client artifacts from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/data ./data

# Expose server port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start the unified Express application
CMD ["node", "server/dist/index.js"]
