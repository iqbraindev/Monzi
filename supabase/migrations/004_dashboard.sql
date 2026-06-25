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

CREATE TABLE agent_dashboard_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB,
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT REFERENCES users(id),
  target_type TEXT,
  target_id TEXT,
  action TEXT NOT NULL,
  payload JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_target ON audit_log(target_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
