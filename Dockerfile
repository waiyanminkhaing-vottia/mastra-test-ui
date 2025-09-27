# Multi-stage build for Next.js app
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Install pnpm
RUN npm install -g pnpm

# Build arguments for environment and app
ARG ENV=production
ARG APP_NAME=default

# Set base path based on app name for build
RUN case "${APP_NAME}" in \
      "default") \
        BASE_PATH="" ;; \
      "sanden") \
        BASE_PATH="/sanden" ;; \
      "fasthelp") \
        BASE_PATH="/fasthelp" ;; \
      *) \
        BASE_PATH="" ;; \
    esac && \
    echo "NEXT_PUBLIC_BASE_PATH=${BASE_PATH}" > .env && \
    echo "Created .env with BASE_PATH=${BASE_PATH} for app: ${APP_NAME}"

# Copy only specific env files needed for build
COPY .env* ./

# Copy the rest of the application
COPY . .

# Build the application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Change ownership of the working directory to the nextjs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Make port configurable
ARG CUSTOM_PORT=3000
ENV PORT=$CUSTOM_PORT
EXPOSE $CUSTOM_PORT

# Set Mastra server URL based on app name (same container, different ports)
ARG APP_NAME=default
ENV APP_NAME=${APP_NAME}

# Copy secure startup script
COPY --chown=nextjs:nextjs docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]