# AgriSmart — Production Deployment Guide

Monorepo with two deployables:

- **`client/`** — React + Vite SPA. Builds to `client/dist`. Deploy as static hosting.
- **`server/`** — Fastify (TypeScript, ESM) API proxy. Builds to `server/dist`. Deploy as a Node service (Docker or any Node 22 host). Listens on `PORT` (default `4000`), binds `0.0.0.0`.

---

## 0. Rotate leaked keys FIRST

> **WARNING:** Any API keys previously committed to this repository must be considered compromised.
> Before deploying, **rotate `OPENWEATHER_API_KEY`, `GROQ_API_KEY`, and `ADMIN_TOKEN`** at their respective providers and issue fresh values. Never reuse the old keys. The config layer rejects obvious placeholders (`REPLACE_WITH_YOUR_ROTATED_KEY` / `REPLACE_WITH_YOUR_ROTATED_GROQ_KEY`), so set real rotated values.

---

## 1. Environment variables

### Server (`server/`)

Validated by `server/src/config.ts` (Zod). The build fails to start if required vars are invalid.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `4000` | Port the server listens on. |
| `OPENWEATHER_API_KEY` | **yes** | — | Min length 10. Rotate before deploy. |
| `OPENWEATHER_BASE_URL` | no | `https://api.openweathermap.org/data/2.5` | |
| `OPENWEATHER_GEO_URL` | no | `https://api.openweathermap.org/geo/1.0` | |
| `ALLOWED_ORIGIN` | no | `http://localhost:5173` | **Set to the prod client URL** (CORS origin). |
| `CACHE_TTL_SECONDS` | no | `600` | Min 300. In-memory cache TTL. |
| `LOG_LEVEL` | no | `info` | `trace`/`debug`/`info`/`warn`/`error`/`fatal`. |
| `GROQ_API_KEY` | no | `''` | Required for AI features. Rotate before deploy. |
| `GROQ_BASE_URL` | no | `https://api.groq.com` | |
| `GROQ_MODEL_TEXT` | no | `llama-3.3-70b-versatile` | |
| `GROQ_MODEL_VISION` | no | `meta-llama/llama-4-scout-17b-16e-instruct` | |
| `GROQ_MAX_TOKENS` | no | `4500` | Max 8192. Upper bound on completion tokens; `callGroq` clamps every request to this, so it must clear the most token-hungry feature (crop advisory). |
| `GROQ_TIMEOUT_MS` | no | `30000` | Max 120000. |
| `ADMIN_TOKEN` | no | `''` | Set a strong rotated value to protect admin routes. |
| `NODE_ENV` | no | — | Set to `production` (Dockerfile sets this). |

### Client (`client/`)

Vite inlines `VITE_*` vars at **build time** — they must be set in the build environment, not at runtime.

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | **yes** | Public URL of the deployed server (e.g. `https://api.yourdomain.com`). Must be set when running the client build. |

---

## 2. Deploy the client (static SPA)

The app uses `createBrowserRouter`, so the host must serve `index.html` for all unknown routes. SPA fallback files are already included:

- **Netlify:** `client/public/_redirects` → `/*  /index.html  200`
- **Vercel:** `client/vercel.json` → rewrites all routes to `/index.html`

### Vercel / Netlify settings

- **Root / base directory:** `client`
- **Build command:** `npm run build`  (`tsc -b && vite build`)
- **Output directory:** `dist`
- **Env:** set `VITE_API_BASE_URL` to the prod server URL **before building**.

For other static hosts (S3+CloudFront, nginx, etc.), configure an equivalent fallback that rewrites all non-asset paths to `/index.html` with HTTP 200.

---

## 3. Deploy the server

### Option A — Docker (recommended)

```bash
# from server/
docker build -t agrismart-server .
docker run -d -p 4000:4000 \
  -e OPENWEATHER_API_KEY=... \
  -e GROQ_API_KEY=... \
  -e ADMIN_TOKEN=... \
  -e ALLOWED_ORIGIN=https://your-client-url \
  --name agrismart-server \
  agrismart-server
```

The image is multi-stage Node 22 alpine, runs as a non-root user, exposes `4000`, and has a `HEALTHCHECK` hitting `/api/health`.

### Option B — any Node 22 host

```bash
# from server/
npm ci
npm run build
NODE_ENV=production node dist/index.js   # = npm start
```

Provide the env vars listed above through your platform's secret manager. Always set `ALLOWED_ORIGIN` to the prod client URL.

---

## 4. Scaling — single instance only

> **IMPORTANT:** The server keeps **cache and rate-limit state in memory** (`node-cache`, `@fastify/rate-limit`). Running multiple replicas would give inconsistent rate limiting and duplicate upstream calls.
>
> **Run a single instance (`replicas=1`)** unless you add a shared store (e.g. Redis) for cache and rate-limit state.

---

## 5. Health check

- **Endpoint:** `GET /api/health`
- Used by the Docker `HEALTHCHECK` and suitable for load-balancer / platform health probes.

---

## 6. CI

`.github/workflows/ci.yml` runs on push/PR to `main`: separate `client` and `server` jobs on Node 22, each running `npm ci` then typecheck + build in its directory. Keep CI green before deploying.
