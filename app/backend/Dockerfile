# ── Stage 1: Builder ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests and install
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src

# Set ownership
RUN chown -R appuser:appgroup /app

# Expose the application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Switch to non-root user
USER appuser

# Start the application
CMD ["node", "src/index.js"]
