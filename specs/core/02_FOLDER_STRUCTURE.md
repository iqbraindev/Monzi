# 02 — Full Project Folder Structure

```
aria/
├── .env.local                          # All environment variables (see 03_ENV_VARIABLES.md)
├── .env.example                        # Template for .env.local
├── next.config.ts                      # Next.js config
├── tailwind.config.ts                  # Tailwind + custom tokens
├── tsconfig.json
├── middleware.ts                       # Clerk auth + role enforcement
│
├── prisma/                             # (optional ORM layer over Supabase)
│   └── schema.prisma
│
├── supabase/
│   ├── migrations/                     # SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rbac_tables.sql
│   │   ├── 003_agent_tables.sql
│   │   ├── 004_dashboard_tables.sql
│   │   └── 005_rls_policies.sql
│   └── seed.sql                        # Default packs + super admin
│
├── public/
│   ├── avatars/                        # Default avatar assets (Lottie JSON)
│   │   ├── avatar-01.json
│   │   ├── avatar-02.json
│   │   └── ...
│   └── icons/
│
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # Root layout (ClerkProvider, QueryProvider)
│   │   ├── page.tsx                    # Landing page
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/                     # Auth group (no sidebar)
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   │
│   │   ├── (onboarding)/               # Onboarding flow
│   │   │   └── onboarding/
│   │   │       ├── page.tsx            # Step controller
│   │   │       ├── step-integration/page.tsx
│   │   │       ├── step-agent/page.tsx
│   │   │       └── step-dashboard/page.tsx
│   │   │
│   │   ├── (app)/                      # Main app (with sidebar)
│   │   │   ├── layout.tsx              # App shell (sidebar + topbar)
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx            # Default dashboard
│   │   │   │   └── [dashboardId]/page.tsx
│   │   │   ├── agents/
│   │   │   │   ├── page.tsx            # Agents list
│   │   │   │   ├── new/page.tsx        # Create agent wizard
│   │   │   │   └── [agentId]/
│   │   │   │       ├── page.tsx        # Agent chat
│   │   │   │       └── settings/page.tsx
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx            # Connected apps
│   │   │   ├── subaccounts/
│   │   │   │   ├── page.tsx            # Manage subaccounts
│   │   │   │   └── [subId]/page.tsx
│   │   │   ├── billing/
│   │   │   │   └── page.tsx            # Plans + usage
│   │   │   └── settings/
│   │   │       └── page.tsx            # User settings
│   │   │
│   │   ├── (admin)/                    # Super admin (role-gated)
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx            # Admin overview
│   │   │       ├── users/page.tsx
│   │   │       ├── packs/page.tsx
│   │   │       ├── billing/page.tsx
│   │   │       ├── usage/page.tsx
│   │   │       ├── features/page.tsx
│   │   │       └── audit/page.tsx
│   │   │
│   │   └── api/
│   │       ├── agents/
│   │       │   ├── route.ts            # GET list, POST create
│   │       │   └── [agentId]/
│   │       │       ├── route.ts        # GET, PATCH, DELETE
│   │       │       └── memory/route.ts
│   │       ├── chat/
│   │       │   └── [agentId]/route.ts  # POST — streaming AI response
│   │       ├── dashboard/
│   │       │   ├── route.ts            # GET list, POST create dashboard
│   │       │   └── [dashboardId]/
│   │       │       ├── route.ts
│   │       │       └── widgets/
│   │       │           ├── route.ts    # GET, POST widgets
│   │       │           └── [widgetId]/route.ts
│   │       ├── voice/
│   │       │   ├── stt/route.ts        # Speech to text
│   │       │   └── tts/route.ts        # Text to speech
│   │       ├── composio/
│   │       │   ├── connect/route.ts    # OAuth init
│   │       │   ├── callback/route.ts   # OAuth callback
│   │       │   └── execute/route.ts    # Tool execution
│   │       ├── admin/
│   │       │   ├── users/route.ts
│   │       │   ├── packs/route.ts
│   │       │   └── impersonate/route.ts
│   │       └── webhooks/
│   │           ├── clerk/route.ts      # Clerk user events
│   │           └── stripe/route.ts     # Stripe billing events
│
├── src/components/
│   ├── ui/                             # shadcn/ui components
│   ├── agents/
│   │   ├── AgentCard.tsx
│   │   ├── AgentAvatar.tsx             # Lottie animated avatar
│   │   ├── AgentCreatorWizard.tsx
│   │   ├── AgentChatWindow.tsx
│   │   ├── AgentSelector.tsx           # Switch between agents
│   │   └── AgentInsightBar.tsx         # Top bar proactive insights
│   ├── dashboard/
│   │   ├── DashboardGrid.tsx           # react-grid-layout wrapper
│   │   ├── DashboardTabs.tsx           # Multiple dashboard switcher
│   │   ├── WidgetWrapper.tsx           # Common widget shell
│   │   ├── WidgetPicker.tsx            # Add widget modal
│   │   ├── widgets/
│   │   │   ├── EmailWidget.tsx
│   │   │   ├── TasksWidget.tsx
│   │   │   ├── CalendarWidget.tsx
│   │   │   ├── CRMWidget.tsx
│   │   │   ├── FinanceWidget.tsx
│   │   │   ├── ChartWidget.tsx
│   │   │   ├── SlackWidget.tsx
│   │   │   └── InsightsWidget.tsx      # AI-generated insights
│   │   └── AgentDashboardBridge.tsx    # Listens for agent dashboard events
│   ├── voice/
│   │   ├── VoiceOrb.tsx               # Floating voice button
│   │   ├── VoiceRecorder.tsx
│   │   └── VoiceWaveform.tsx
│   ├── billing/
│   │   ├── PlanCard.tsx
│   │   ├── UsageMeter.tsx
│   │   └── UpgradePrompt.tsx           # Shows when limit hit
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── CommandPalette.tsx          # Cmd+K
│   │   └── NotificationBell.tsx
│   └── admin/
│       ├── UserTable.tsx
│       ├── PackEditor.tsx
│       ├── UsageChart.tsx
│       └── AuditLog.tsx
│
├── src/lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   ├── server.ts                   # Server Supabase client
│   │   └── admin.ts                    # Service role client (admin only)
│   ├── clerk/
│   │   └── metadata.ts                 # Clerk metadata helpers
│   ├── stripe/
│   │   ├── client.ts
│   │   └── products.ts                 # Plan → Stripe price mapping
│   ├── composio/
│   │   ├── client.ts
│   │   └── tools.ts                    # Tool definitions per category
│   ├── langchain/
│   │   ├── agent.ts                    # Main agent orchestrator
│   │   ├── memory.ts                   # Memory service
│   │   ├── tools/
│   │   │   ├── dashboard.tools.ts      # Dashboard manipulation tools
│   │   │   ├── composio.tools.ts       # Composio tool wrappers
│   │   │   └── system.tools.ts         # Date, weather, calc...
│   │   └── prompts/
│   │       ├── system.prompt.ts        # Base system prompt builder
│   │       └── personalities.ts        # Agent personality templates
│   ├── limits/
│   │   ├── enforcer.ts                 # LimitEnforcer class
│   │   └── checker.ts                  # Per-feature checks
│   ├── redis/
│   │   ├── client.ts
│   │   ├── cache.ts                    # Widget data caching
│   │   └── ratelimit.ts                # Rate limiter
│   └── utils/
│       ├── cn.ts                       # classnames utility
│       ├── format.ts                   # Date, currency formatters
│       └── errors.ts                   # Error types
│
├── src/hooks/
│   ├── useAgent.ts
│   ├── useChat.ts                      # Vercel AI SDK useChat
│   ├── useDashboard.ts
│   ├── useWidget.ts
│   ├── useVoice.ts
│   ├── useLimits.ts                    # Check limits client-side
│   └── useRealtimeDashboard.ts         # Supabase Realtime listener
│
├── src/stores/
│   ├── agent.store.ts                  # Active agent, agent list
│   ├── dashboard.store.ts              # Widgets, layouts, dashboards
│   ├── voice.store.ts                  # Voice state
│   └── ui.store.ts                     # Sidebar, modals, panels
│
└── src/types/
    ├── agent.types.ts
    ├── dashboard.types.ts
    ├── widget.types.ts
    ├── user.types.ts
    ├── pack.types.ts
    └── composio.types.ts
```
