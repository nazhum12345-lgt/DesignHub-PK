# ==============================================================================
# VELORA — Production Dockerfile
# Multi-stage container build for portable full-stack deployment
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies required for vite build)
RUN npm ci

# Copy project source code
COPY . .

# Build the client SPA to /app/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy package descriptors
COPY package*.json ./

# Install production dependencies only (tsx is in dependencies for unified startup)
RUN npm ci --omit=dev

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend server and essential configuration
COPY server.ts ./
COPY tsconfig.json ./
COPY index.html ./
COPY src ./src
COPY data ./data
COPY private_storage ./private_storage

# Create persistent storage directories with appropriate permissions
RUN mkdir -p /app/data /app/private_storage && \
    chmod -R 755 /app/data /app/private_storage

# Declare persistent volumes for database records and digital master files
VOLUME ["/app/data", "/app/private_storage"]

# Expose standard application port (can be overridden via PORT env var)
EXPOSE 3000

# Health check to ensure Express server responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/storefront || exit 1

# Start full-stack application (Express serves both /api and built frontend)
CMD ["npm", "start"]
