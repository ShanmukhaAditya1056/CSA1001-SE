# DevTrack API — lightweight Alpine container for Render (frontend ships separately to Vercel)
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# The API server has zero runtime dependencies; it only needs its own code
# plus the shared domain rules module.
COPY package*.json ./
COPY server ./server
COPY src/rules.js ./src/rules.js

# Security: Non-root user
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server/src/server.js"]
