<div align="center">

# 🌾 AgriSmart

**AI for every Indian farmer** — crop advisory, leaf-disease diagnosis, soil &
fertilizer plans, hyperlocal weather, and satellite-based moisture-stress
detection, in one app and six languages.

</div>

---

## Overview

AgriSmart is a production-grade, multilingual web app that puts practical,
agronomist-informed decisions in a farmer's pocket. It combines a rule-based
foundation (so it always works, even offline) with AI layers for richer,
personalised advice.

- **Frontend** — React 19 + Vite SPA, TypeScript, Tailwind CSS.
- **Backend** — Fastify (TypeScript, ESM) API proxy that keeps provider keys
  server-side and adds caching, rate-limiting, and graceful fallbacks.
- **Languages** — English, Hindi, Kannada, Tamil, Telugu, Marathi (full app, not
  just labels).

## Features

| Feature | What it does |
|---|---|
| 🌱 **Crop Advisory** | Recommends the crops most likely to thrive on a plot from soil + season, with yield estimates. |
| 🔬 **Leaf Disease Detector** | Diagnoses disease, severity, and treatments from a leaf photo (vision model). |
| 🧪 **Soil & Fertilizer Plan** | Eco-friendly fertilizer/pesticide recommendations tuned to NPK, pH, and organic carbon. |
| 🛰️ **Satellite Crop Advisory** | Crop-type classification, growth-stage mapping, moisture-stress detection, and irrigation guidance from fused optical + SAR satellite data. See [docs](docs/SATELLITE_ADVISORY.md). |
| ☀️ **Weather Alerts** | 7-day forecasts and proactive warnings for heat, heavy rain, and frost. |
| 💬 **AI Assistant** | Conversational help on pests, prices, and paperwork, in the user's language. |
| 🌐 **Six languages** | Language- and font-aware, lazy-loaded per locale. |

## Tech stack

**Client:** React 19 · Vite · TypeScript · Tailwind CSS · React Router ·
React Hook Form + Zod · Recharts · Framer Motion · i18next · lucide-react

**Server:** Fastify 5 · TypeScript (ESM) · Groq SDK (LLaMA 3.3 70B text,
LLaMA 4 Scout vision) · OpenWeatherMap · Zod · node-cache · pino ·
`@fastify/rate-limit` · `@fastify/cors`

## Project structure

```
agrismart/
├── client/                 # React + Vite SPA (deploys to static hosting)
│   └── src/
│       ├── app/            # layouts, router, session
│       ├── components/     # ui primitives + shared components
│       ├── features/       # one folder per feature (advisory, disease, soil,
│       │                   #   satellite, weather, chatbot, dashboard, …)
│       ├── lib/            # API clients, engines, utilities
│       └── i18n/           # six language dictionaries
├── server/                 # Fastify API proxy (deploys as a Node service)
│   └── src/
│       ├── routes/         # weather, chat, advisory, soil, disease, satellite, admin
│       ├── services/       # provider clients + rule engines
│       ├── data/           # datasets / fixtures
│       └── lib/            # cache, logging, rate-limiting, errors
├── docs/                   # deep-dive docs (e.g. SATELLITE_ADVISORY.md)
└── DEPLOYMENT.md           # production deployment guide
```

## Getting started

### Prerequisites
- Node.js 22+
- npm

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:4000
```

Minimum environment variables (validated by `server/src/config.ts`):

| Variable | Required | Notes |
|---|---|---|
| `OPENWEATHER_API_KEY` | **yes** | Weather + geocoding. Min length 10. |
| `GROQ_API_KEY` | no | Enables AI features; falls back to rule-based advice if absent. |
| `ALLOWED_ORIGIN` | no | CORS origin — set to the client URL (default `http://localhost:5173`). |
| `PORT` | no | Default `4000`. |

> The satellite advisory engine is fully rule-based and needs **no** API key.

### 2. Frontend

```bash
cd client
npm install
npm run dev            # http://localhost:5173
```

Optional client env: `VITE_API_BASE_URL` (defaults to `http://localhost:4000`).

## Scripts

**Client** — `npm run dev` · `npm run build` · `npm run preview` · `npm run lint`
**Server** — `npm run dev` · `npm run build` · `npm start` · `npm run typecheck`

## Deployment

The repo is a monorepo with two independently deployable units:

- **`client/`** → static hosting (e.g. Vercel). Builds to `client/dist`.
- **`server/`** → any Node 22 host or Docker (`server/Dockerfile`). Binds
  `0.0.0.0` on `PORT`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full guide, including key rotation and
the complete environment-variable reference.

## Security

- Provider API keys live only on the server; the client never sees them.
- Zod-validated config and request bodies.
- Global and per-route rate-limiting, secure CORS, structured logging.
- Per-user/per-IP hourly limits on AI routes with graceful fallbacks.

## License

Private project — all rights reserved.
