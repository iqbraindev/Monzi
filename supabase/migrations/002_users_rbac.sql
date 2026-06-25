CREATE TYPE user_role AS ENUM ('super_admin', 'user', 'subaccount');

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  parent_user_id TEXT REFERENCES users(id),
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
  max_agents INT NOT NULL DEFAULT 1,
  max_agent_memory_mb INT NOT NULL DEFAULT 100,
  max_subaccounts INT NOT NULL DEFAULT 0,
  subaccount_can_create_agents BOOLEAN DEFAULT false,
  subaccount_can_connect_integrations BOOLEAN DEFAULT false,
  ai_messages_per_month INT NOT NULL DEFAULT 50,
  ai_messages_per_day INT NOT NULL DEFAULT 10,
  max_tokens_per_message INT NOT NULL DEFAULT 2000,
  priority_llm_access BOOLEAN DEFAULT false,
  max_dashboards INT NOT NULL DEFAULT 1,
  max_widgets_per_dashboard INT NOT NULL DEFAULT 5,
  dashboard_refresh_interval_sec INT NOT NULL DEFAULT 300,
  max_integrations INT NOT NULL DEFAULT 1,
  voice_enabled BOOLEAN DEFAULT false,
  custom_avatar_enabled BOOLEAN DEFAULT false,
  custom_agent_personality BOOLEAN DEFAULT false,
  api_access BOOLEAN DEFAULT false,
  white_label BOOLEAN DEFAULT false,
  storage_mb INT NOT NULL DEFAULT 100,
  support_level TEXT DEFAULT 'community',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  custom_limits JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
