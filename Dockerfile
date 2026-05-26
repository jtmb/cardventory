# Stage 1: Dependencies
FROM node:22-bullseye-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 pkg-config curl ca-certificates \
    libvips-dev libheif-dev libjpeg-dev libpng-dev libwebp-dev libavif-dev && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:22-bullseye-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Set a dummy secret for build-time (real secret injected at runtime)
ENV AUTH_SECRET=build-placeholder
ENV DATABASE_PATH=/app/data/cardventory.db

# Pre-download Tesseract English language data so OCR works offline at runtime
RUN mkdir -p tessdata && \
    curl -sL "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz" \
    | gunzip > tessdata/eng.traineddata

RUN NODE_OPTIONS=--max-old-space-size=2048 npm run build

# Stage 3: Runner
FROM node:22-bullseye-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips42 libheif1 ca-certificates && rm -rf /var/lib/apt/lists/* || true
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --home /nonexistent --shell /usr/sbin/nologin nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/tessdata ./tessdata

# Create data and uploads directories for volume mounts
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R nextjs:nodejs /app/data /app/public/uploads

ARG APP_VERSION=dev
LABEL org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.title="Cardventory" \
      org.opencontainers.image.source="https://github.com/jtmb/cardventory"

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
