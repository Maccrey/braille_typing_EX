# CloudType optimized Dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache sqlite python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN npm ci --prefix backend --only=production

# Copy application files
COPY backend ./backend
COPY frontend ./frontend
COPY .env.example ./.env

# Initialize database
RUN npm run db:init --prefix backend

# Create necessary directories
RUN mkdir -p ./backend/uploads ./backend/database

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start the application
CMD ["npm", "start", "--prefix", "backend"]