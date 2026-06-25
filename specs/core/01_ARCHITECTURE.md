# 01 — System Architecture & Data Flow

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Browser / Mobile)                                      │
│                                                                 │
│  ┌─────────────────┐    ┌────────────────────────────────────┐ │
│  │   Agent Chat    │    │      Dashboard Engine              │ │
│  │   Voice Input   │◄──►│  react-grid-layout + Widgets       │ │
│  │   Cmd+K Palette │    │  Real-time via Supabase            │ │
│  └────────┬────────┘    └──────────────┬─────────────────────┘ │
└───────────┼──────────────────────────── ┼───────────────────────┘
            │  HTTPS / WebSocket          │ Supabase Realtime
┌───────────▼─────────────────────────────▼───────────────────────┐
│  NEXT.JS 15 (Vercel)                                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Middleware (Clerk auth check + role enforcement)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  API Routes:                                                    │
│  /api/agents/*        — Agent CRUD & config                     │
│  /api/chat/*          — AI streaming endpoint                   │
│  /api/dashboard/*     — Widget CRUD & layout                    │
│  /api/voice/*         — STT / TTS endpoints                     │
│  /api/webhooks/*      — Stripe + Clerk webhooks                 │
│  /api/admin/*         — Super admin endpoints                   │
│  /api/composio/*      — Integration proxy                       │
└───────────┬─────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────┐
│  SERVICES LAYER                                                 │
│                                                                 │
│  AgentOrchestrator   — LangChain agent runner                   │
│  LimitEnforcer       — Pack limits checking                     │
│  MemoryService       — pgvector read/write                      │
│  DashboardService    — Widget operations                        │
│  VoiceService        — STT/TTS routing                          │
│  ComposioService     — Integration tool execution               │
└───────────┬─────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────┐
│  DATA LAYER                                                     │
│                                                                 │
│  Supabase PostgreSQL  — Primary database                        │
│  Supabase pgvector    — Agent memory embeddings                 │
│  Supabase Realtime    — Live dashboard updates                  │
│  Supabase Storage     — Avatar images, user files               │
│  Upstash Redis        — Rate limiting, caching, sessions        │
└───────────┬─────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                              │
│                                                                 │
│  Clerk          — Auth & user management                        │
│  Composio       — 250+ app integrations                         │
│  Stripe         — Billing & subscriptions                       │
│  OpenAI         — GPT-4o, embeddings, Whisper, TTS             │
│  Anthropic      — Claude (fallback/long context)                │
│  ElevenLabs     — Premium agent voices                          │
│  Deepgram       — Real-time STT                                 │
│  Langfuse       — LLM observability                             │
│  PostHog        — Product analytics                             │
│  Sentry         — Error tracking                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Core Data Flows

### 1. User Sends a Chat Message

```
User types/speaks message
    → STT if voice (Deepgram/Whisper)
    → POST /api/chat/[agentId]
    → Middleware: Clerk auth check
    → LimitEnforcer.canSendMessage(userId)
        → If limit reached: return 402 with upgrade prompt
    → Load agent config from DB
    → MemoryService.recall(userId, agentId, message)
        → Embed message → pgvector similarity search
        → Return top-K relevant memories
    → Build system prompt:
        [agent personality] + [memories] + [user profile] + [tools]
    → LangChain agent runner
        → Tool selection via LLM
        → Execute Composio tools if needed
        → Dashboard tools if UI action needed
    → Stream response back to client
    → MemoryService.store(userId, agentId, exchange)
        → Extract facts → embed → store in pgvector
    → usage_tracking.increment(userId, 'ai_messages')
    → Langfuse.log(trace)
```

### 2. Agent Creates a Dashboard Widget

```
Agent decides to show data visually
    → Calls createWidget tool
    → DashboardService.createWidget(config)
        → Insert into widgets table
        → Fetch data from Composio
        → Store in Redis cache (TTL per refresh_interval)
    → Supabase Realtime broadcast: 'widget:created'
    → Frontend receives event
        → Zustand store update
        → react-grid-layout re-renders with new widget
        → Widget animates in (Framer Motion)
    → Agent says: "Here's your [data] — I've added it to your dashboard"
```

### 3. New User Onboarding

```
User signs up via Clerk
    → Clerk webhook: user.created
    → POST /api/webhooks/clerk
        → Create user in users table
        → Create free subscription in subscriptions table
        → Create default workspace
        → Create default "Assistant" agent
        → Create default dashboard with 3 starter widgets
        → Create Stripe customer
    → Redirect to onboarding wizard
        → Step 1: Connect first integration (Composio OAuth)
        → Step 2: Customize first agent (name, avatar, role)
        → Step 3: Dashboard preview
    → Redirect to /dashboard
```

### 4. Stripe Subscription Change

```
User upgrades plan
    → POST /api/stripe/checkout (create Stripe Checkout session)
    → Stripe Checkout page
    → Payment success
    → Stripe webhook: checkout.session.completed
        → Update subscriptions table (pack_id, status, period dates)
        → Update Clerk publicMetadata (plan)
        → Provision new limits in Redis cache
        → Send confirmation email
    → User redirected to /dashboard with new features unlocked
```

---

## 🔐 Security Model

```
Request arrives
    ├── Clerk JWT validation (middleware)
    ├── Role check (super_admin / user / subaccount)
    ├── Resource ownership check (does user own this agent/dashboard?)
    ├── Subaccount scope check (is resource in allowed list?)
    ├── Rate limit check (Redis sliding window)
    └── Pack limit check (LimitEnforcer)
```

### Row-Level Security (Supabase RLS)
Every table has RLS policies:
- Users can only SELECT/UPDATE/DELETE their own rows
- Subaccounts can only access rows where parent_user_id = their parent
- Super admin bypasses RLS via service role key (server-side only)

---

## ⚡ Performance Strategy

| Concern | Solution |
|---|---|
| Widget data freshness | Redis cache per widget, TTL = refresh_interval |
| AI response speed | Streaming (Vercel AI SDK), GPT-4o-mini for simple queries |
| Cold start | Edge functions for latency-sensitive routes |
| Dashboard load | Parallel widget data fetching (Promise.all) |
| Memory recall | pgvector HNSW index on embeddings |
| Rate limiting | Upstash Redis sliding window per user |
