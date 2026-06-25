# 20 — Master Integration Plan
## Step-by-Step Build Order for AI Coding Agent

> ⚠️ READ ALL SPEC FILES BEFORE WRITING ANY CODE.
> Follow phases in strict order. Each phase builds on the previous.
> Run and verify each phase before moving to the next.

---

## 🗺️ Phase Overview

```
Phase 1: Foundation          → Project setup, DB, auth
Phase 2: Core User Flow      → Onboarding, agents, basic chat
Phase 3: Dashboard Engine    → Widgets, grid, data fetching
Phase 4: AI-Dashboard Bridge → Agent controls UI
Phase 5: RBAC & Billing      → Limits, plans, Stripe
Phase 6: Voice & UX Polish   → Voice, animations, Cmd+K
Phase 7: Admin Panel         → Super admin dashboard
Phase 8: Launch Prep         → Testing, monitoring, deploy
```

---

## PHASE 1 — Foundation (Days 1-3)

### 1.1 Project Init
```bash
npx create-next-app@latest aria --typescript --tailwind --app --src-dir
cd aria
npx shadcn@latest init
npx shadcn@latest add button card input label badge dialog sheet tabs
```

### 1.2 Install All Dependencies
```bash
# Core
npm install zustand @tanstack/react-query framer-motion

# Auth
npm install @clerk/nextjs

# Database
npm install @supabase/supabase-js @supabase/ssr

# AI
npm install ai @ai-sdk/openai @ai-sdk/anthropic langchain @langchain/openai @langchain/core

# Integrations
npm install composio-core

# Billing
npm install stripe @stripe/stripe-js

# Dashboard
npm install react-grid-layout
npm install --save-dev @types/react-grid-layout

# Redis
npm install @upstash/redis @upstash/ratelimit

# Voice
npm install openai   # already via ai sdk

# Utils
npm install date-fns zod svix lottie-react cmdk

# Monitoring
npm install @sentry/nextjs posthog-js langfuse
```

### 1.3 Database Setup
```
1. Create Supabase project
2. Run migrations in order:
   - supabase/migrations/001_extensions.sql
   - supabase/migrations/002_users_rbac.sql
   - supabase/migrations/003_agents.sql
   - supabase/migrations/004_dashboard.sql
   - supabase/migrations/005_rls.sql
3. Run supabase/seed.sql
4. Verify tables exist in Supabase dashboard
5. Enable Realtime on: dashboards, widgets tables
```

### 1.4 Auth Setup (Clerk)
```
1. Create Clerk application
2. Enable Google OAuth provider
3. Create webhook endpoint → point to /api/webhooks/clerk
4. Subscribe to events: user.created, user.deleted
5. Copy all keys to .env.local
6. Implement middleware.ts (see 08_RBAC_SYSTEM.md)
7. Wrap app/layout.tsx with <ClerkProvider>
8. Test: sign up creates user in DB
```

### 1.5 Environment Verification
```
- [ ] Supabase connection works
- [ ] Clerk sign-up creates DB user
- [ ] Redis connection works
- [ ] All env vars present
```

---

## PHASE 2 — Core User Flow (Days 4-7)

### 2.1 Landing Page
```
File: app/page.tsx
- Hero section (product value prop)
- Features section
- Pricing section (static, linked to /billing)
- CTA: "Get Started Free"
```

### 2.2 App Shell
```
Files:
  app/(app)/layout.tsx      → sidebar + topbar shell
  components/layout/Sidebar.tsx
  components/layout/Topbar.tsx

Sidebar items:
  - Dashboard (default)
  - Agents
  - Integrations
  - Subaccounts (user only, hide for subaccount role)
  - Billing (user only)
  - Settings
  - Admin (super_admin only)
```

### 2.3 Onboarding Wizard
```
Files:
  app/(onboarding)/onboarding/page.tsx
  - Step 1: "Connect your first app" → Composio OAuth
  - Step 2: "Create your first agent" → name, avatar, role picker
  - Step 3: "Your dashboard is ready" → preview + launch

On complete:
  - Set onboarding_completed = true (DB + Clerk metadata)
  - Redirect to /dashboard
```

### 2.4 Agent CRUD
```
Files:
  app/(app)/agents/page.tsx         → agent grid
  app/(app)/agents/new/page.tsx     → creator wizard
  app/(app)/agents/[agentId]/page.tsx → chat interface

API:
  app/api/agents/route.ts           → GET (list), POST (create)
  app/api/agents/[agentId]/route.ts → GET, PATCH, DELETE

Components:
  components/agents/AgentCard.tsx
  components/agents/AgentAvatar.tsx   (Lottie)
  components/agents/AgentCreatorWizard.tsx
```

### 2.5 Basic Chat
```
File: app/api/chat/[agentId]/route.ts

Use Vercel AI SDK streamText():
  1. Auth check
  2. LimitEnforcer.canSendMessage(userId)
  3. Load agent from DB
  4. Recall memories (MemoryService)
  5. Build system prompt
  6. streamText({ model, system, messages })
  7. Return StreamingTextResponse
  8. After stream: store memory, increment usage

Frontend: use useChat() from 'ai/react'
```

### 2.6 Verify Phase 2
```
- [ ] Can create an agent
- [ ] Can chat with agent (streaming works)
- [ ] Memory stored after conversation
- [ ] Usage counter increments
- [ ] Onboarding flow complete
```

---

## PHASE 3 — Dashboard Engine (Days 8-12)

### 3.1 Dashboard CRUD
```
API:
  /api/dashboard                    → GET list, POST create
  /api/dashboard/[id]               → GET, PATCH, DELETE
  /api/dashboard/[id]/widgets       → GET, POST
  /api/dashboard/[id]/widgets/[wid] → PATCH, DELETE
```

### 3.2 Widget Registry
```
File: src/lib/dashboard/widget-registry.ts
- Register all widget types (see 05_DASHBOARD_ENGINE.md)
- Each entry: label, icon, composio_tool, default layout
```

### 3.3 Grid Layout
```
File: components/dashboard/DashboardGrid.tsx
- Install & configure react-grid-layout
- Drag to reposition
- Resize handles
- Save layout changes to DB (debounced)
```

### 3.4 Widget Components
Build in this order (simplest first):
```
1. InsightsWidget    → AI text only, no Composio needed
2. TasksWidget       → Notion
3. CalendarWidget    → Google Calendar
4. EmailWidget       → Gmail
5. CRMWidget         → HubSpot
6. FinanceWidget     → Stripe
7. ChartWidget       → Generic (recharts)
```

Each widget:
```
- useWidgetData hook (fetches via /api/composio/execute)
- Loading skeleton
- Error state with retry
- Quick AI actions in footer
```

### 3.5 Composio Data Fetching
```
File: app/api/composio/execute/route.ts
- Auth + rate limit
- Execute Composio tool
- Cache result in Redis (TTL = widget refresh interval)
- Return data

File: src/lib/composio/client.ts
- Initialize Composio with API key
```

### 3.6 Dashboard Tabs
```
File: components/dashboard/DashboardTabs.tsx
- Tab per dashboard
- "+" to create new
- Agent-created dashboards show ✨
```

### 3.7 Verify Phase 3
```
- [ ] Can add widgets to dashboard
- [ ] Widgets load real data from Composio
- [ ] Drag and resize works, layout saved
- [ ] Multiple dashboards, tab switching
- [ ] Redis caching works (check Upstash console)
```

---

## PHASE 4 — AI-Dashboard Bridge (Days 13-15)

### 4.1 Dashboard Tools
```
File: src/lib/langchain/tools/dashboard.tools.ts
Implement all 5 tools (see 06_AI_DASHBOARD_BRIDGE.md):
  - createWidgetTool
  - createDashboardTool
  - highlightWidgetTool
  - openWidgetTool
  - readWidgetDataTool
```

### 4.2 Supabase Realtime
```
File: src/hooks/useRealtimeDashboard.ts
- Subscribe to dashboard:${id} channel
- Handle: widget:created, widget:highlight, widget:focus
- Subscribe to user:${userId} channel
- Handle: dashboard:created

File: components/dashboard/AgentDashboardBridge.tsx
- Mount this in app layout
- Always listening for agent events
```

### 4.3 Update Chat API
```
File: app/api/chat/[agentId]/route.ts
- Add dashboard tools to LangChain agent
- Add Composio tools based on agent config
- Test agent creating a widget via chat
```

### 4.4 Command Palette
```
File: components/layout/CommandPalette.tsx
- Cmd+K shortcut
- Free text → sends to active agent
- Preset commands for common actions
```

### 4.5 Agent Insight Bar
```
File: components/agents/AgentInsightBar.tsx
- Fetch proactive insights from agent every 10 min
- Display top insight at top of dashboard
- "Tell me more" → opens chat panel
```

### 4.6 Verify Phase 4
```
- [ ] Say "show me my emails" → email widget appears on dashboard
- [ ] Say "build me a meeting prep view" → new dashboard created
- [ ] Cmd+K works, free text routes to agent
- [ ] Insight bar shows relevant alerts
- [ ] Widget highlight works (agent draws attention)
```

---

## PHASE 5 — RBAC & Billing (Days 16-19)

### 5.1 LimitEnforcer
```
File: src/lib/limits/enforcer.ts
Implement all checks (see 08_RBAC_SYSTEM.md):
  - canSendMessage
  - canCreateAgent
  - canCreateSubaccount
  - canUseFeature
  - incrementUsage
```

### 5.2 Apply Limits to All Routes
```
Wrap every restricted API route with withLimitCheck():
  - /api/chat/[agentId]    → canSendMessage
  - /api/agents (POST)     → canCreateAgent
  - /api/dashboard (POST)  → check max_dashboards
  - /api/subaccounts (POST)→ canCreateSubaccount
```

### 5.3 UpgradePrompt Component
```
File: components/billing/UpgradePrompt.tsx
- Show when 402 received from API
- Show when isAtLimit() in hooks
- Link to /billing
```

### 5.4 Stripe Setup
```
1. Create Stripe account + products (see 15_STRIPE_INTEGRATION.md)
2. Implement /api/stripe/checkout
3. Implement /api/stripe/portal
4. Implement /api/webhooks/stripe
5. Test: upgrade to Pro → limits update → new features unlock
```

### 5.5 Billing Page
```
File: app/(app)/billing/page.tsx
- Show current plan + usage meters
- Plan comparison cards
- "Upgrade" → Stripe Checkout
- "Manage Billing" → Stripe Portal
```

### 5.6 Subaccounts
```
Files:
  app/(app)/subaccounts/page.tsx      → list subaccounts
  app/api/subaccounts/route.ts        → CRUD

Flow:
  - User creates subaccount (email invite via Clerk)
  - Set role='subaccount', parent_user_id in DB
  - Configure permissions (agents, dashboards, limits)
  - Subaccount gets restricted access
```

### 5.7 Verify Phase 5
```
- [ ] Free user hits message limit → upgrade prompt shown
- [ ] Stripe checkout works
- [ ] Subscription upgrade updates limits instantly
- [ ] Subaccount can only access assigned agents/dashboards
- [ ] Usage meters accurate on billing page
```

---

## PHASE 6 — Voice & UX Polish (Days 20-22)

### 6.1 Voice Input
```
File: components/voice/VoiceRecorder.tsx
- Hold-to-record button
- Deepgram streaming STT (for speed) 
  OR OpenAI Whisper (simpler)
- On release → send transcribed text to chat
```

### 6.2 Voice Output
```
File: app/api/voice/tts/route.ts
- Accept text + agent voice config
- Call ElevenLabs or OpenAI TTS
- Stream audio back
- Frontend plays audio after agent responds
```

### 6.3 Floating Voice Orb
```
File: components/voice/VoiceOrb.tsx
- Floating button in bottom right
- Press to start, release to send
- Animated waveform while recording
- Only on Pro+ plans
```

### 6.4 Avatar Animations
```
File: components/agents/AgentAvatar.tsx
- Lottie player with 3 states:
  idle     → slow breathing animation
  thinking → loading dots / spinning
  talking  → mouth movement animation
- Switch states based on chat state
```

### 6.5 UX Polish
```
- Framer Motion page transitions
- Widget add/remove animations
- Toast notifications for agent actions
- Skeleton loaders everywhere
- Empty states with helpful copy
- Mobile responsive layout
```

---

## PHASE 7 — Admin Panel (Days 23-25)

```
Route: /admin (super_admin only, middleware protected)

Pages to build:
  /admin              → KPIs: MRR, users, AI cost, churn
  /admin/users        → Table: search, filter, view, suspend, impersonate
  /admin/packs        → Edit pack limits and pricing
  /admin/billing      → Revenue breakdown, Stripe embed
  /admin/usage        → AI usage & cost per user
  /admin/features     → Feature flag toggles
  /admin/audit        → Audit log timeline

Key components:
  components/admin/UserTable.tsx    → DataTable with actions
  components/admin/PackEditor.tsx   → Edit limits form
  components/admin/UsageChart.tsx   → recharts usage over time
  components/admin/AuditLog.tsx     → Timeline of actions
```

---

## PHASE 8 — Launch Prep (Days 26-28)

### 8.1 Monitoring Setup
```
- Sentry: instrument API routes and client
- PostHog: add page view + key event tracking
  Events to track:
    agent_created, message_sent, widget_added,
    dashboard_created, upgrade_clicked, integration_connected
- Langfuse: wrap all LLM calls with tracing
```

### 8.2 Error Handling Audit
```
- Every API route has try/catch
- User-facing errors are friendly (no stack traces)
- 402 responses show upgrade prompt
- Network errors show retry option
- Composio disconnected: show reconnect button
```

### 8.3 Performance
```
- Widget data parallel fetching (Promise.all)
- Next.js Image optimization for avatars
- Vercel Edge Functions for latency-critical routes
- Redis cache hit rate > 80% for widget data
```

### 8.4 Security Audit
```
- [ ] All API routes check auth()
- [ ] Resource ownership verified before operations
- [ ] Subaccount scope enforced
- [ ] Rate limiting on all AI/Composio routes
- [ ] Webhook signatures verified (Clerk + Stripe)
- [ ] Service role key never exposed to client
- [ ] RLS policies tested
```

### 8.5 Deploy to Vercel
```bash
# Push to GitHub
git add . && git commit -m "feat: Monzi v1.0"
git push origin main

# Vercel
vercel --prod

# Set all env vars in Vercel dashboard
# Update webhook URLs in Clerk + Stripe to production URL
# Run smoke tests
```

---

## ✅ Full Feature Checklist

### Auth & Users
- [ ] Sign up / Sign in (email + Google)
- [ ] Onboarding wizard
- [ ] Role-based access (super_admin, user, subaccount)
- [ ] Subaccount creation and permissions

### Agents
- [ ] Create agent (name, avatar, role, personality)
- [ ] Edit / delete agent
- [ ] Chat with agent (streaming)
- [ ] Agent memory (short-term + long-term)
- [ ] Voice input/output per agent

### Dashboard
- [ ] Create/delete dashboards
- [ ] Add/remove/resize/reorder widgets
- [ ] All widget types (email, tasks, calendar, CRM, finance...)
- [ ] Real-time data refresh
- [ ] Multiple dashboards with tabs

### AI-Dashboard Bridge
- [ ] Agent creates widget from chat
- [ ] Agent creates full dashboard from chat
- [ ] Agent highlights data in widget
- [ ] Agent opens specific data view
- [ ] Cmd+K command palette

### Billing & Limits
- [ ] Free, Starter, Pro, Business plans
- [ ] Stripe Checkout + Portal
- [ ] Usage tracking and metering
- [ ] Limit enforcement with upgrade prompts
- [ ] Plan upgrades unlock features immediately

### Admin
- [ ] User management (view, suspend, impersonate)
- [ ] Pack limit editor
- [ ] Revenue dashboard
- [ ] AI usage and cost monitoring
- [ ] Audit log
- [ ] Feature flags

---

## 📦 Recommended Package Versions

```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "@clerk/nextjs": "^6.0.0",
  "@supabase/supabase-js": "^2.45.0",
  "@supabase/ssr": "^0.5.0",
  "langchain": "^0.3.0",
  "@langchain/openai": "^0.3.0",
  "ai": "^4.0.0",
  "composio-core": "^0.5.0",
  "stripe": "^17.0.0",
  "@upstash/redis": "^1.34.0",
  "@upstash/ratelimit": "^2.0.0",
  "react-grid-layout": "^1.4.4",
  "zustand": "^5.0.0",
  "@tanstack/react-query": "^5.60.0",
  "framer-motion": "^11.0.0",
  "zod": "^3.23.0",
  "recharts": "^2.13.0",
  "lottie-react": "^2.4.0",
  "cmdk": "^1.0.0",
  "date-fns": "^4.0.0",
  "svix": "^1.40.0"
}
```
