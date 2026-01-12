# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
COPY apps/backend/prisma apps/backend/prisma/

# Install all dependencies (including dev for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared packages/shared/
COPY apps/backend apps/backend/
COPY tsconfig.base.json ./

# Generate Prisma client and build
WORKDIR /app/apps/backend
RUN pnpm prisma generate
WORKDIR /app
RUN pnpm --filter @chess-website/shared build
RUN pnpm --filter @chess-website/backend build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy workspace files for production install
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
COPY apps/backend/prisma apps/backend/prisma/

# Install production dependencies only (ignore-scripts to skip husky)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files
COPY --from=builder /app/packages/shared/dist packages/shared/dist/
COPY --from=builder /app/apps/backend/dist apps/backend/dist/
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma node_modules/.prisma/

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
