# Build arguments
ARG NODE_VERSION=22-alpine3.22
ARG PNPM_VERSION=10.32.1
ARG WORKDIR_PATH=/opt/app

# Base stage
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
ARG WORKDIR_PATH

# Install updates
RUN apk upgrade --no-cache

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

ENV NODE_ENV=development

WORKDIR ${WORKDIR_PATH}

# Copy workspace config and all package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib/package.json ./lib/
COPY app/package.json ./app/
COPY standalone/cli/package.json ./standalone/cli/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY lib/ ./lib/
COPY app/ ./app/

# Build stage
FROM base AS builder
ARG WORKDIR_PATH
RUN pnpm --filter lib build && pnpm --filter app build


# Production stage
FROM node:${NODE_VERSION} AS production
ARG WORKDIR_PATH

ENV NODE_ENV=production

WORKDIR ${WORKDIR_PATH}

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only the Nuxt output (self-contained, no node_modules needed)
COPY --from=builder --chown=nodejs:nodejs ${WORKDIR_PATH}/app/.output ./

USER nodejs

EXPOSE 3000

CMD ["node", "server/index.mjs"]
