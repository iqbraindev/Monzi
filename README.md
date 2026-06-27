# Monzi

**Your AI multi-agent personal and business assistant.**

Monzi is a SaaS platform where you create specialized AI agents, connect the apps you already use, and manage everything from a single conversational dashboard. Talk or type to your agents — they can read email, check calendars, run CRM workflows, and update your dashboard in real time.

Think **Notion + conversational AI + HubSpot** — but driven by AI agents you configure.

---

## What you can do

- **Create AI agents** — Give each agent a name, personality, role, and voice. Assign connected apps and capabilities per agent.
- **Chat with agents** — Streamed text chat powered by OpenRouter (GPT-4o, Claude, and more).
- **Talk live** — Real-time voice calls via ElevenLabs, with Monzi's own LLM handling reasoning, Composio tools, and dashboard actions on each turn.
- **Connect your apps** — OAuth integrations through [Composio](https://composio.dev) (Gmail, Google Calendar, Notion, Slack, HubSpot, Stripe, GitHub, and others).
- **360° dashboard** — Drag-and-drop widgets on a personal dashboard; agents can create and update widgets through chat.
- **Team & billing** — Clerk authentication, subscription plans via Stripe, subaccounts, and usage limits by plan.
- **Multiple workspaces** — Each workspace is isolated (agents, dashboards, integrations). Plan limits set how many workspaces you can create and how many resources each workspace may use.

---

## Workspaces

Monzi accounts can own multiple **workspaces**. Billing stays on the account; each workspace has its own agents, dashboards, Composio connections, and usage counters.

| Plan | Max workspaces |
|------|----------------|
| Free | 1 |
| Starter | 2 |
| Pro | 5 |
| Business | Unlimited |

Switch workspaces from the sidebar. Create additional workspaces from the workspace menu (when your plan allows).

### Composio integration migration

OAuth connections are now scoped per workspace (`ws_{workspaceId}` in Composio). After upgrading:

- Your **default workspace** keeps working via a legacy fallback to pre-migration connections tied to your Clerk user ID.
- **New workspaces** need integrations connected again under Integrations.
- To move connections fully to workspace scope, disconnect and reconnect each app in your default workspace once.

Apply database migration `supabase/migrations/009_workspaces.sql` (included in Docker init) before using workspace features.

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Framer Motion, TanStack Query, Zustand |
| **AI** | Vercel AI SDK, LangChain, OpenRouter, ElevenLabs (live voice) |
| **Auth** | Clerk |
| **Database** | PostgreSQL 16 + pgvector, Supabase-compatible API (PostgREST) |
| **Cache** | Redis |
| **Integrations** | Composio |
| **Billing** | Stripe |
| **Observability** | Langfuse, PostHog, Sentry (optional) |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended) — runs Postgres, PostgREST, and Redis locally
- API keys for external services: **Clerk**, **OpenRouter**, and optionally **Composio**, **Stripe**, and **ElevenLabs** for voice

---

## Quick start (Docker — recommended)

```bash
# 1. Copy the env template and add your API keys
cp .env.example .env

# 2. Start the full stack (app + database + Redis)
docker compose up --build

# 3. Open the app
open http://localhost:3000
```

On first run, Docker initializes the database (migrations + seed). Sign up through Clerk to create your workspace, default agent, and dashboard.

For architecture details, voice setup, and troubleshooting, see **[DOCKER.md](./DOCKER.md)**.

---

## Local development (without the app container)

Run infrastructure in Docker and the Next.js dev server on your host:

```bash
docker compose up postgres postgrest supabase-api redis -d
cp .env.example .env
npm install
npm run dev
```

Ensure these values in `.env` when running on the host:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/aria
REDIS_URL=redis://localhost:6379
SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in at minimum:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` | Authentication |
| `OPENROUTER_API_KEY` | LLM inference for chat and agents |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Database API (pre-filled for local Docker) |
| `DATABASE_URL` / `REDIS_URL` | Direct Postgres and Redis connections |

Optional but recommended:

| Variable | Purpose |
|----------|---------|
| `COMPOSIO_API_KEY` | Third-party app integrations |
| `STRIPE_*` | Subscriptions and billing |
| `ELEVENLABS_*` | Live voice mode |
| `LANGFUSE_*`, `NEXT_PUBLIC_POSTHOG_*`, `SENTRY_*` | Observability |

Full reference: [`specs/core/03_ENV_VARIABLES.md`](./specs/core/03_ENV_VARIABLES.md)

---

## Live voice (optional)

Voice mode uses ElevenLabs for audio (STT + TTS) and routes each turn to Monzi's custom LLM endpoint — the same agent logic, Composio tools, and dashboard actions as text chat.

```bash
# After setting ELEVENLABS_* in .env
node scripts/setup-elevenlabs-agent.mjs
node scripts/configure-elevenlabs-custom-llm.mjs
```

For local development, ElevenLabs must reach your app over the public internet (e.g. ngrok). See the **Voice** section in [DOCKER.md](./DOCKER.md).

---

## Project structure

```
src/
├── app/                    # Next.js App Router — pages & API routes
│   ├── (app)/              # Authenticated app (dashboard, agents, integrations, billing, settings)
│   ├── (auth)/             # Clerk sign-in / sign-up
│   └── api/                # Chat, agents, Composio, ElevenLabs voice, webhooks
├── components/aria/        # Product UI (agents, dashboard, voice, integrations)
├── hooks/                  # React hooks (voice session, etc.)
└── lib/                    # Agents, AI, Composio, dashboard, Stripe, Supabase

supabase/migrations/        # PostgreSQL schema
specs/                      # Product & architecture specifications
scripts/                    # ElevenLabs setup helpers
docker/                     # Postgres init, nginx proxy for PostgREST
```

---

## Scripts

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

---

## Health check

```bash
curl http://localhost:3000/api/health
```

Returns connectivity status for environment variables, Supabase (PostgREST), Redis, and Composio.

---

## Documentation

| Document | Description |
|----------|-------------|
| [DOCKER.md](./DOCKER.md) | Docker setup, services, voice architecture |
| [specs/00_PROJECT_OVERVIEW.md](./specs/00_PROJECT_OVERVIEW.md) | Product vision, plans, and spec index |
| [specs/core/01_ARCHITECTURE.md](./specs/core/01_ARCHITECTURE.md) | System architecture and data flows |
| [specs/core/03_ENV_VARIABLES.md](./specs/core/03_ENV_VARIABLES.md) | Complete environment variable reference |

---

## App routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Personal dashboard with widgets |
| `/agents` | Agent list and configuration |
| `/agents/[id]` | Chat and live voice with an agent |
| `/integrations` | Connect third-party apps |
| `/subaccounts` | Manage team subaccounts |
| `/billing` | Plan, usage, and invoices |
| `/settings` | Account and voice preferences |
