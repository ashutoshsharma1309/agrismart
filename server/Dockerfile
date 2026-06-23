# syntax=docker/dockerfile:1

# ---- Stage 1: build ----
FROM node:22-alpine AS build
WORKDIR /app

# Install all deps (incl. dev) for the TypeScript build.
COPY package.json package-lock.json* ./
RUN npm ci

# Compile TypeScript -> dist/ (server "build" = tsc -p tsconfig.json).
COPY . .
RUN npm run build

# ---- Stage 2: production runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Production-only deps.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output from the build stage.
COPY --from=build /app/dist ./dist

# Run as the built-in non-root "node" user.
USER node

EXPOSE 4000

# Healthcheck hits the server's /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# server "start" = node dist/index.js
CMD ["node", "dist/index.js"]
