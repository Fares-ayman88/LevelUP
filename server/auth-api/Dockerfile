FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system nodejs && useradd --system --gid nodejs --home /app nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY server/auth-api ./server/auth-api

RUN mkdir -p /app/server/auth-api/tmp/uploads && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const port=process.env.PORT||8090; fetch(`http://127.0.0.1:${port}/api/v1/health`).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/auth-api/src/server.js"]
