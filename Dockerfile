# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install necessary system dependencies
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Backend dependencies stage
FROM base AS backend-deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Frontend dependencies stage
FROM base AS frontend-deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --only=production

# Production stage
FROM base AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy backend files
COPY --chown=nodeuser:nodejs backend/ ./backend/
COPY --from=backend-deps --chown=nodeuser:nodejs /app/backend/node_modules ./backend/node_modules

# Copy frontend files
COPY --chown=nodeuser:nodejs frontend/ ./frontend/
COPY --from=frontend-deps --chown=nodeuser:nodejs /app/frontend/node_modules ./frontend/node_modules

# Copy configuration files
COPY --chown=nodeuser:nodejs .env.example ./.env
COPY --chown=nodeuser:nodejs package*.json ./

# Create necessary directories
RUN mkdir -p ./backend/uploads ./backend/database && \
    chown -R nodeuser:nodejs ./backend/uploads ./backend/database

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "backend/server.js"]