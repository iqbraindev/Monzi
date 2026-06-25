# Docker Development Setup

Run the full Monzi stack locally with Docker Compose — no external Postgres, Redis, or Supabase cloud required.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)
- A `.env` file with your external service keys (Clerk, Stripe, OpenRouter, OpenAI for voice, etc.)

## Quick Start

```bash
# 1. Copy env template and fill in external keys (Clerk, OpenRouter, OpenAI, etc.)
cp .env.example .env

# 2. Start all services
docker compose up --build

# 3. Open the app
open http://localhost:3000
```

The first `docker compose up` initializes the database (migrations + seed). This only runs on a fresh Postgres volume.

## Services

| Service         | Port  | Description                                      |
|-----------------|-------|--------------------------------------------------|
| `app`           | 3000  | Next.js dev server (hot reload via volume mount) |
| `postgres`      | 5432  | PostgreSQL 16 with pgvector extension            |
| `supabase-api`  | 54321 | Nginx proxy exposing `/rest/v1/` for Supabase JS |
| `postgrest`     | (internal) | PostgREST backend                           |
| `redis`         | 6379  | Redis 7 — caching, rate limits                    |

## Environment Variables

Docker Compose overrides these for container networking:

| Variable | Inside Docker | On Host (local dev without Docker) |
|----------|---------------|-------------------------------------|
| `DATABASE_URL` | `postgres://postgres:postgres@postgres:5432/aria` | `postgres://postgres:postgres@localhost:5432/aria` |
| `REDIS_URL` | `redis://redis:6379` | `redis://localhost:6379` |
| `SUPABASE_URL` | `http://supabase-api` | `http://localhost:54321` |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:54321` | `http://localhost:54321` |

The Supabase anon/service-role keys in `.env.example` are pre-generated for local PostgREST. Do not use these in production.

### Voice (ElevenLabs Conversational AI)

Live voice uses ElevenLabs for audio (STT + TTS) and Monzi's custom LLM for reasoning — same Composio tools and connected apps as text chat.

```bash
ELEVENLABS_API_KEY=sk_xxx
ELEVENLABS_AGENT_ID=agent_xxx
ELEVENLABS_DEFAULT_VOICE_ID=cjVigY5qzO86Huf0OWal
ELEVENLABS_CUSTOM_LLM_SECRET=monzi-voice-llm-dev-secret
# ELEVENLABS_CUSTOM_LLM_URL=https://your-subdomain.ngrok-free.app  # required for local dev
```

```bash
node scripts/setup-elevenlabs-agent.mjs
node scripts/configure-elevenlabs-custom-llm.mjs
```

ElevenLabs servers call `POST /api/elevenlabs/v1/chat/completions` on your app. For local dev, expose the app via ngrok and set `ELEVENLABS_CUSTOM_LLM_URL`.

## OpenRouter

All LLM calls go through [OpenRouter](https://openrouter.ai) via the OpenAI-compatible API:

```
OPENROUTER_API_KEY=sk-or-xxx
OPENROUTER_MODEL=openai/gpt-4o
```

Use `src/lib/ai/openrouter.ts` for Vercel AI SDK and LangChain integrations.

## External Services (not containerized)

These require cloud API keys and cannot run locally in Docker:

- **Clerk** — authentication
- **Stripe** — billing and subscriptions
- **OpenRouter** — LLM inference for text chat (API key required)
- **ElevenLabs** — Conversational AI for live voice (STT + TTS); LLM runs on Monzi via custom endpoint
- **Composio** — third-party app integrations
- **Langfuse / PostHog / Sentry** — observability (optional)

## Common Commands

```bash
# Start in background
docker compose up -d --build

# View logs
docker compose logs -f app

# Stop everything
docker compose down

# Reset database (destroys data)
docker compose down -v

# Rebuild app only
docker compose build app

# Run app locally against Docker infra (no app container)
docker compose up postgres postgrest supabase-api redis -d
npm run dev
```

When running `npm run dev` on the host (not in Docker), set in `.env`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/aria
REDIS_URL=redis://localhost:6379
SUPABASE_URL=http://localhost:54321
```

## Production Build

```bash
docker build --target runner -t aria:latest .
```

The `runner` stage uses Next.js standalone output. For production, point env vars at managed infrastructure instead of local containers.

### Production voice note

Live voice uses ElevenLabs for audio. The Next.js app needs `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, and `ELEVENLABS_CUSTOM_LLM_SECRET`, with a publicly reachable app URL for the custom LLM callback.

## Health Check

```bash
curl http://localhost:3000/api/health
```

Returns status of env vars, Supabase (PostgREST), and Redis connectivity.

## Architecture

```
┌─────────────┐     signed URL + voice token
│  Browser    │──────────────────────────────────────┐
└──────┬──────┘                                      │
       │ realtime audio                               ▼
       ▼                              ┌──────────────────────────┐
┌──────────────────────┐              │ Next.js                  │
│ ElevenLabs           │── LLM turn ─▶│ /api/elevenlabs/v1/      │
│ (STT + TTS)          │◀── response ─│ chat/completions         │
└──────────────────────┘              │ (Composio + dashboard)     │
                                      └──────────────────────────┘
```

Voice flow: browser requests a signed URL + voice token from `POST /api/elevenlabs/voice-session` → connects to ElevenLabs for audio → each turn ElevenLabs calls `POST /api/elevenlabs/v1/chat/completions` (Monzi agent with Composio/dashboard tools) → response is spoken back. Transcripts sync via `POST /api/elevenlabs/transcript`.

PostgREST exposes the Postgres schema as a Supabase-compatible REST API, so existing `@supabase/supabase-js` clients work without changes.
