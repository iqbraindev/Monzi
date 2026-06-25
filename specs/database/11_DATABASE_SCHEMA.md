# 11 — Full Database Schema

## Run all migrations in order in Supabase SQL editor.

---

## Migration 001 — Enable Extensions

```sql
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";           -- pgvector for memory embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- for text search
```

---

## Migration 002 — Users & RBAC

```sql
CREATE TYPE user_role AS ENUM ('super_admin', 'user', 'subaccount');

CREATE TABLE users (
  id TEXT PRIMARY KEY,                              -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  parent_user_id TEXT REFERENCES users(id),         -- NULL for user/admin, set for subaccounts
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_reason TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_parent ON users(parent_user_id) WHERE parent_user_id IS NOT NULL;

-- ── Packs ─────────────────────────────────────────────────────────
CREATE TABLE packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pack_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID UNIQUE REFERENCES packs(id) ON DELETE CASCADE,
  -- Agents
  max_agents INT NOT NULL DEFAULT 1,
  max_agent_memory_mb INT NOT NULL DEFAULT 100,
  -- Subaccounts
  max_subaccounts INT NOT NULL DEFAULT 0,
  subaccount_can_create_agents BOOLEAN DEFAULT false,
  subaccount_can_connect_integrations BOOLEAN DEFAULT false,
  -- AI Usage
  ai_messages_per_month INT NOT NULL DEFAULT 50,       -- -1 = unlimited
  ai_messages_per_day INT NOT NULL DEFAULT 10,          -- -1 = unlimited
  max_tokens_per_message INT NOT NULL DEFAULT 2000,
  priority_llm_access BOOLEAN DEFAULT false,
  -- Dashboard
  max_dashboards INT NOT NULL DEFAULT 1,
  max_widgets_per_dashboard INT NOT NULL DEFAULT 5,
  dashboard_refresh_interval_sec INT NOT NULL DEFAULT 300,
  -- Integrations
  max_integrations INT NOT NULL DEFAULT 1,             -- -1 = unlimited
  -- Features
  voice_enabled BOOLEAN DEFAULT false,
  custom_avatar_enabled BOOLEAN DEFAULT false,
  custom_agent_personality BOOLEAN DEFAULT false,
  api_access BOOLEAN DEFAULT false,
  white_label BOOLEAN DEFAULT false,
  -- Storage
  storage_mb INT NOT NULL DEFAULT 100,
  -- Support
  support_level TEXT DEFAULT 'community',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Subscriptions ─────────────────────────────────────────────────
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'paused', 'incomplete'
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES packs(id),
  status subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  custom_limits JSONB,                                  -- super admin overrides
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Subaccount Permissions ────────────────────────────────────────
CREATE TABLE subaccount_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subaccount_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  parent_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  allowed_agent_ids UUID[] DEFAULT '{}',
  allowed_dashboard_ids UUID[] DEFAULT '{}',
  can_create_agents BOOLEAN DEFAULT false,
  can_connect_integrations BOOLEAN DEFAULT false,
  can_edit_dashboards BOOLEAN DEFAULT false,
  ai_messages_monthly_limit INT DEFAULT 50,
  storage_limit_mb INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Usage Tracking ────────────────────────────────────────────────
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  ai_messages_used INT DEFAULT 0,
  ai_tokens_used BIGINT DEFAULT 0,
  ai_cost_usd DECIMAL(10,4) DEFAULT 0,
  storage_used_mb DECIMAL(10,2) DEFAULT 0,
  integrations_connected INT DEFAULT 0,
  agents_created INT DEFAULT 0,
  widgets_created INT DEFAULT 0,
  UNIQUE(user_id, period_start)
);

CREATE TABLE usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ai_messages INT DEFAULT 0,
  ai_tokens BIGINT DEFAULT 0,
  ai_cost_usd DECIMAL(10,4) DEFAULT 0,
  UNIQUE(user_id, date)
);
```

---

## Migration 003 — Agent Tables

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'general_assistant',
  description TEXT,
  avatar JSONB NOT NULL DEFAULT '{
    "style": "lottie",
    "asset_id": "avatar-01",
    "primary_color": "#6366f1",
    "background_color": "#1e1b4b"
  }',
  personality JSONB NOT NULL DEFAULT '{
    "preset": "friendly",
    "tone": "warm and helpful",
    "language": "en",
    "response_style": "conversational"
  }',
  voice JSONB NOT NULL DEFAULT '{
    "provider": "openai",
    "voice_id": "alloy",
    "speed": 1.0,
    "enabled": false
  }',
  tools JSONB NOT NULL DEFAULT '{
    "composio_apps": [],
    "dashboard_control": true,
    "web_search": true,
    "file_access": false,
    "calculator": true
  }',
  memory_config JSONB NOT NULL DEFAULT '{
    "max_short_term_messages": 20,
    "long_term_enabled": true,
    "memory_scope": "agent"
  }',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_agents_user ON agents(user_id);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_agent ON conversations(agent_id);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Long-term memory (pgvector)
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),                               -- text-embedding-3-small
  source_conversation_id UUID REFERENCES conversations(id),
  importance FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX idx_memories_embedding ON agent_memories
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_memories_user_agent ON agent_memories(user_id, agent_id);

-- pgvector similarity search function
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_user_id TEXT,
  match_agent_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT id, content, 1 - (embedding <=> query_embedding) as similarity
  FROM agent_memories
  WHERE user_id = match_user_id
    AND agent_id = match_agent_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Migration 004 — Dashboard Tables

```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📊',
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_by TEXT CHECK (created_by IN ('user', 'agent')) DEFAULT 'user',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboards_user ON dashboards(user_id);

CREATE TABLE widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  data_source JSONB NOT NULL,
  layout JSONB NOT NULL,
  style JSONB DEFAULT '{"theme": "default", "show_title": true, "show_last_updated": true}',
  is_highlighted BOOLEAN DEFAULT false,
  created_by TEXT CHECK (created_by IN ('user', 'agent')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widgets_dashboard ON widgets(dashboard_id);

-- Agent dashboard action log
CREATE TABLE agent_dashboard_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB,
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration 005 — Audit Log & Features

```sql
-- Feature flags
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pack_features (
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  feature_key TEXT REFERENCES features(key) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB,
  PRIMARY KEY (pack_id, feature_key)
);

-- Audit log (super admin)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT REFERENCES users(id),
  target_type TEXT,                                    -- 'user', 'pack', 'agent'...
  target_id TEXT,
  action TEXT NOT NULL,                                -- 'user.suspend', 'pack.update'...
  payload JSONB,                                       -- {before: {...}, after: {...}}
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_target ON audit_log(target_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

---

## Migration 006 — Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users: can only see themselves (server bypasses with service key)
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid()::text = id);

-- Agents: users see their own agents
CREATE POLICY "agents_owner" ON agents
  FOR ALL USING (auth.uid()::text = user_id);

-- Dashboards: users see their own dashboards
CREATE POLICY "dashboards_owner" ON dashboards
  FOR ALL USING (auth.uid()::text = user_id);

-- Widgets: accessible via dashboard ownership
CREATE POLICY "widgets_via_dashboard" ON widgets
  FOR ALL USING (
    dashboard_id IN (
      SELECT id FROM dashboards WHERE user_id = auth.uid()::text
    )
  );

-- NOTE: Super admin always uses supabase service role key (bypasses RLS)
-- NOTE: Subaccount access is enforced at application layer, not DB layer
```

---

## Seed Data

```sql
-- Default packs
INSERT INTO packs (name, slug, description, price_monthly, price_yearly, sort_order, is_public) VALUES
  ('Free', 'free', 'Get started with Monzi', 0, 0, 0, true),
  ('Starter', 'starter', 'For individuals getting productive', 19, 190, 1, true),
  ('Pro', 'pro', 'For power users and small teams', 49, 490, 2, true),
  ('Business', 'business', 'For teams and agencies', 99, 990, 3, true);

-- Pack limits
INSERT INTO pack_limits (pack_id, max_agents, max_subaccounts, ai_messages_per_month, ai_messages_per_day, max_dashboards, max_widgets_per_dashboard, max_integrations, voice_enabled, custom_avatar_enabled, storage_mb, support_level)
SELECT id, 1,  0,  50,    10,  1, 5,  1,  false, false, 100,  'community' FROM packs WHERE slug = 'free'
UNION ALL
SELECT id, 3,  2,  500,   50,  3, 15, 5,  true,  false, 1000, 'email'     FROM packs WHERE slug = 'starter'
UNION ALL
SELECT id, 10, 5,  2000,  200, 10, 30, 20, true,  true,  10000,'chat'     FROM packs WHERE slug = 'pro'
UNION ALL
SELECT id, -1, 20, -1,    -1,  -1, -1, -1, true,  true, 100000,'dedicated' FROM packs WHERE slug = 'business';

-- Default features
INSERT INTO features (key, name, description) VALUES
  ('voice', 'Voice Mode', 'Talk to your agents'),
  ('custom_avatar', 'Custom Avatars', 'Upload or customize agent avatars'),
  ('api_access', 'API Access', 'Programmatic access to your agents'),
  ('white_label', 'White Label', 'Remove Monzi branding'),
  ('advanced_memory', 'Advanced Memory', 'Extended long-term memory'),
  ('priority_ai', 'Priority AI', 'Faster AI responses with GPT-4o');
```
