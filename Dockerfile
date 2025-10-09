# Use the official Node.js runtime as the base image
# Support multi-architecture builds
FROM --platform=$BUILDPLATFORM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# Git is required for git dependencies like mastra-test-common
RUN apk add --no-cache libc6-compat git openssh-client
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with lockfile verification
# For private git repos, you may need to build with --build-arg or secrets
RUN --mount=type=secret,id=github_token \
    if [ -f /run/secrets/github_token ]; then \
        git config --global url."https://oauth2:$(cat /run/secrets/github_token)@github.com/".insteadOf "https://github.com/"; \
    fi && \
    pnpm config set auto-install-peers false && \
    pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install pnpm in builder stage
RUN corepack enable pnpm

# NODE_ENV should always be production for optimized builds
ENV NODE_ENV=production

# Copy tenant-specific favicon before build
# Read NEXT_PUBLIC_TENANT_ID from .env file and copy appropriate favicon
RUN set -a; \
    if [ -f .env ]; then \
      . ./.env; \
    fi; \
    set +a; \
    if [ -n "$NEXT_PUBLIC_TENANT_ID" ] && [ -f "public/favicon-${NEXT_PUBLIC_TENANT_ID}.svg" ]; then \
      echo "✅ Using tenant favicon: favicon-${NEXT_PUBLIC_TENANT_ID}.svg"; \
      cp "public/favicon-${NEXT_PUBLIC_TENANT_ID}.svg" src/app/icon.svg; \
    elif [ -f "public/favicon.svg" ]; then \
      echo "✅ Using default favicon: favicon.svg"; \
      cp public/favicon.svg src/app/icon.svg; \
    else \
      echo "⚠️ No favicon found, keeping existing src/app/icon.svg"; \
    fi

# Build the application with env vars from .env file
# Load .env and export variables before building
RUN set -a; \
    if [ -f .env ]; then \
      . ./.env; \
    fi; \
    set +a; \
    pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Add only essential tools for health checks (conditional)
ARG INCLUDE_DEBUG_TOOLS=false
RUN if [ "$INCLUDE_DEBUG_TOOLS" = "true" ]; then \
      apk add --no-cache curl wget; \
    else \
      apk add --no-cache curl; \
    fi

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Port configuration - can be overridden at build time or runtime
ARG PORT=3000
ENV PORT=${PORT}
ENV HOSTNAME="0.0.0.0"

EXPOSE ${PORT}

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]