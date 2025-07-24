# Multi-stage build for production optimization
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with proper npm commands for newer versions
RUN npm ci --omit=dev && npm cache clean --force

# Production stage
FROM node:18-alpine as production

# Install system dependencies for monitoring
RUN apk add --no-cache \
    curl \
    htop \
    procps \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S daasr -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies from builder stage
COPY --from=builder --chown=daasr:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=daasr:nodejs . .

# Create required directories
RUN mkdir -p logs data && \
    chown -R daasr:nodejs logs data

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info \
    METRICS_RETENTION_HOURS=24 \
    ALERT_CHECK_INTERVAL=30000

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Switch to non-root user
USER daasr

# Add labels for better container management
LABEL org.opencontainers.image.title="DAASR Enterprise Monitoring" \
      org.opencontainers.image.description="Enterprise-grade monitoring and rate limiting platform" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.vendor="DAASR Team" \
      org.opencontainers.image.source="https://github.com/daasr-team/daasr-enterprise-middleware"

# Start the application
CMD ["node", "src/index.js"]