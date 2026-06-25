# 🧠 Monzi — AI Multi-Agent Personal & Business Assistant
## Master Project Specification

---

## 📌 What Is Monzi?

Monzi is a **SaaS multi-agent AI platform** that allows non-technical users (lambda users)
to create specialized AI agents with avatars, connect their apps, and get a 360° 
dashboard view of their entire digital ecosystem — all controlled by conversational AI.

Think: **Notion + conversational AI + HubSpot dashboard** — but driven by AI agents.

---

## 🎯 Core Value Proposition

1. **Multi-Agent System** — Users create agents with names, avatars, personalities & specific tasks
2. **360° Dashboard** — Real-time view of all connected apps (email, tasks, CRM, finance...)
3. **AI-Driven UI** — Agents can open, build and modify dashboard widgets on demand
4. **Business & Personal** — Works for individuals and small businesses
5. **Zero Technical Setup** — Wizard-based onboarding, no config files

---

## 👥 User Roles

| Role | Description |
|---|---|
| `super_admin` | Platform owner — full system access |
| `user` | Paying subscriber — manages their workspace & subaccounts |
| `subaccount` | Child account created by a User — scoped access |

---

## 📦 Subscription Plans

| Plan | Price | Key Limits |
|---|---|---|
| Free | $0 | 1 agent, 0 subaccounts, 50 msg/mo |
| Starter | $19/mo | 3 agents, 2 subaccounts, 500 msg/mo |
| Pro | $49/mo | 10 agents, 5 subaccounts, 2000 msg/mo |
| Business | $99/mo | Unlimited agents, 20 subaccounts, unlimited msg |

---

## 🛠️ Tech Stack Summary

### Frontend
- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui** + **Radix UI**
- **Framer Motion** (animations)
- **Zustand** (client state)
- **TanStack Query** (server state)
- **Vercel AI SDK** (streaming AI)
- **react-grid-layout** (dashboard widgets)

### Backend
- **Next.js API Routes** + **Edge Functions**
- **LangChain.js** (agent orchestration)
- **TypeScript** throughout

### Auth & Users
- **Clerk** (authentication, RBAC via metadata)

### Database
- **Supabase** (PostgreSQL + pgvector + Realtime + Storage)
- **Upstash Redis** (caching, rate limiting)

### AI
- **OpenAI GPT-4o** (primary LLM)
- **Anthropic Claude** (fallback / long context)
- **OpenAI Whisper** / **Deepgram** (STT)
- **ElevenLabs** / **OpenAI TTS** (voice per agent)
- **OpenAI text-embedding-3-small** (memory embeddings)

### Integrations
- **Composio** (250+ app integrations)

### Billing
- **Stripe** (subscriptions, webhooks)

### Monitoring
- **PostHog** (analytics)
- **Sentry** (error tracking)
- **Langfuse** (LLM observability)

---

## 📁 Specification Files Index

```
specs/
├── 00_PROJECT_OVERVIEW.md          ← You are here
├── core/
│   ├── 01_ARCHITECTURE.md          ← System architecture & data flow
│   ├── 02_FOLDER_STRUCTURE.md      ← Full Next.js project structure
│   └── 03_ENV_VARIABLES.md         ← All environment variables
├── features/
│   ├── 04_AGENT_SYSTEM.md          ← Agent creation, memory, orchestration
│   ├── 05_DASHBOARD_ENGINE.md      ← Widget system, layout, real-time
│   ├── 06_AI_DASHBOARD_BRIDGE.md   ← How agents control the dashboard
│   └── 07_VOICE_SYSTEM.md          ← STT, TTS, voice per agent
├── rbac/
│   ├── 08_RBAC_SYSTEM.md           ← Roles, permissions, enforcement
│   ├── 09_PACKS_SUBSCRIPTIONS.md   ← Plans, limits, billing flow
│   └── 10_SUPER_ADMIN.md           ← Admin panel specifications
├── database/
│   ├── 11_DATABASE_SCHEMA.md       ← Full PostgreSQL schema + pgvector
│   └── 12_REDIS_CACHE.md           ← Redis keys, TTL, patterns
├── integrations/
│   ├── 13_COMPOSIO_INTEGRATION.md  ← Composio setup & tool patterns
│   ├── 14_CLERK_INTEGRATION.md     ← Clerk setup, metadata, middleware
│   └── 15_STRIPE_INTEGRATION.md    ← Stripe products, webhooks, portal
├── api/
│   ├── 16_API_ROUTES.md            ← All API endpoints specification
│   └── 17_WEBSOCKET_REALTIME.md    ← Supabase Realtime events
└── ui/
    ├── 18_UI_COMPONENTS.md         ← Component library & design system
    ├── 19_PAGES_ROUTES.md          ← All pages, routes, layouts
    └── 20_INTEGRATION_PLAN.md      ← Step-by-step build order
```

---

## 🚀 Build Philosophy for AI Coding Agent

> Read ALL spec files before writing ANY code.
> Follow the integration plan in `20_INTEGRATION_PLAN.md` step by step.
> Never skip the database schema — set it up first.
> Always enforce limits via `LimitEnforcer` before any AI call.
> Every feature must check the user's role before executing.

---

## 🌐 Key URLs (once deployed)

- App: `https://aria.app`
- Admin: `https://aria.app/admin` (super_admin only)
- API: `https://aria.app/api`
- Docs: `https://docs.aria.app`
