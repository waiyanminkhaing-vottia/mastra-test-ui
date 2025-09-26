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

# Build argument for environment
ARG ENV=production

# Copy environment-specific .env file with fallback
RUN echo "Copying environment file for: ${ENV}"
COPY .env* ./
RUN if [ -f ".env.${ENV}" ]; then cp .env.${ENV} .env; elif [ ! -f ".env" ]; then echo "No environment file found!"; exit 1; fi

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

CMD ["node", "server.js"]