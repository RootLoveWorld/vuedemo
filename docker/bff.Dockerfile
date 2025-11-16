# Multi-stage build for NestJS BFF
# Stage 1: Build dependencies and application
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy shared packages
COPY packages ./packages

# Copy BFF application
COPY apps/bff ./apps/bff

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm --filter "@workflow/shared-*" build

# Generate Prisma client
RUN cd apps/bff && pnpm prisma:generate

# Build BFF application
RUN pnpm --filter "@workflow/bff" build

# Stage 2: Production dependencies
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy shared packages
COPY packages ./packages

# Copy BFF package.json
COPY apps/bff/package.json ./apps/bff/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Stage 3: Production runtime
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nestjs:nodejs /app/apps/bff/node_modules ./apps/bff/node_modules

# Copy shared packages built artifacts
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/bff/dist ./apps/bff/dist

# Copy Prisma schema and migrations
COPY --from=builder --chown=nestjs:nodejs /app/apps/bff/prisma ./apps/bff/prisma

# Copy package.json for runtime
COPY --chown=nestjs:nodejs apps/bff/package.json ./apps/bff/

# Create logs directory
RUN mkdir -p /app/apps/bff/logs && chown -R nestjs:nodejs /app/apps/bff/logs

# Switch to non-root user
USER nestjs

# Set working directory to BFF app
WORKDIR /app/apps/bff

# Expose port
EXPOSE 3001

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
