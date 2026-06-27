-- Multi-workspace tenancy: schema, backfill, and RLS updates

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_user_id, slug)
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_user_id);

CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

ALTER TABLE pack_limits ADD COLUMN IF NOT EXISTS max_workspaces INT NOT NULL DEFAULT 1;

UPDATE pack_limits pl
SET max_workspaces = v.max_workspaces
FROM packs p,
LATERAL (
  SELECT CASE p.slug
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'pro' THEN 5
    WHEN 'business' THEN -1
    ELSE 1
  END AS max_workspaces
) v
WHERE pl.pack_id = p.id;

-- Add workspace_id columns (nullable during backfill)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE agent_memories ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE agent_dashboard_actions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE usage_daily ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Backfill: default workspace per account owner
INSERT INTO workspaces (owner_user_id, name, slug, is_default)
SELECT u.id, 'My Workspace', 'default', true
FROM users u
WHERE u.role IN ('user', 'super_admin')
  AND NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.owner_user_id = u.id AND w.is_default = true
  );

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_user_id, 'owner'
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_user_id
);

-- Attach resources to owner's default workspace
UPDATE agents a
SET workspace_id = w.id
FROM workspaces w
WHERE a.workspace_id IS NULL
  AND w.owner_user_id = a.user_id
  AND w.is_default = true;

UPDATE dashboards d
SET workspace_id = w.id
FROM workspaces w
WHERE d.workspace_id IS NULL
  AND w.owner_user_id = d.user_id
  AND w.is_default = true;

UPDATE conversations c
SET workspace_id = a.workspace_id
FROM agents a
WHERE c.workspace_id IS NULL
  AND c.agent_id = a.id
  AND a.workspace_id IS NOT NULL;

UPDATE conversations c
SET workspace_id = w.id
FROM workspaces w
WHERE c.workspace_id IS NULL
  AND w.owner_user_id = c.user_id
  AND w.is_default = true;

UPDATE agent_memories m
SET workspace_id = a.workspace_id
FROM agents a
WHERE m.workspace_id IS NULL
  AND m.agent_id = a.id
  AND a.workspace_id IS NOT NULL;

UPDATE agent_dashboard_actions ada
SET workspace_id = w.id
FROM workspaces w
WHERE ada.workspace_id IS NULL
  AND w.owner_user_id = ada.user_id
  AND w.is_default = true;

UPDATE usage_tracking ut
SET workspace_id = w.id
FROM workspaces w
WHERE ut.workspace_id IS NULL
  AND w.owner_user_id = ut.user_id
  AND w.is_default = true;

UPDATE usage_daily ud
SET workspace_id = w.id
FROM workspaces w
WHERE ud.workspace_id IS NULL
  AND w.owner_user_id = ud.user_id
  AND w.is_default = true;

-- Subaccounts: add to parent's default workspace
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, u.id, 'member'
FROM users u
JOIN workspaces w ON w.owner_user_id = u.parent_user_id AND w.is_default = true
WHERE u.role = 'subaccount'
  AND u.parent_user_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Enforce NOT NULL where data exists
ALTER TABLE agents ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE dashboards ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE agent_memories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE agent_dashboard_actions ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE usage_tracking ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE usage_daily ALTER COLUMN workspace_id SET NOT NULL;

-- Replace slug uniqueness: per workspace
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_user_id_slug_key;
ALTER TABLE agents ADD CONSTRAINT agents_workspace_id_slug_key UNIQUE (workspace_id, slug);

CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_workspace ON dashboards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_memories_workspace ON agent_memories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_workspace ON usage_tracking(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_workspace ON usage_daily(workspace_id);

ALTER TABLE usage_tracking DROP CONSTRAINT IF EXISTS usage_tracking_user_id_period_start_key;
ALTER TABLE usage_tracking ADD CONSTRAINT usage_tracking_workspace_period_key
  UNIQUE (workspace_id, period_start);

ALTER TABLE usage_daily DROP CONSTRAINT IF EXISTS usage_daily_user_id_date_key;
ALTER TABLE usage_daily ADD CONSTRAINT usage_daily_workspace_date_key
  UNIQUE (workspace_id, date);

-- Update memory search to workspace scope
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_workspace_id UUID,
  match_agent_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT id, content, 1 - (embedding <=> query_embedding) as similarity
  FROM agent_memories
  WHERE workspace_id = match_workspace_id
    AND agent_id = match_agent_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_owner" ON agents;
DROP POLICY IF EXISTS "dashboards_owner" ON dashboards;
DROP POLICY IF EXISTS "widgets_via_dashboard" ON widgets;

CREATE POLICY "workspaces_member_read" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "workspaces_owner_write" ON workspaces
  FOR ALL USING (owner_user_id = auth.uid()::text);

CREATE POLICY "workspace_members_self" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()::text
    )
  );

CREATE POLICY "agents_workspace" ON agents
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "dashboards_workspace" ON dashboards
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "widgets_via_workspace_dashboard" ON widgets
  FOR ALL USING (
    dashboard_id IN (
      SELECT d.id FROM dashboards d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE wm.user_id = auth.uid()::text
    )
  );

CREATE POLICY "conversations_workspace" ON conversations
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "messages_via_conversation" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = auth.uid()::text
    )
  );

CREATE POLICY "agent_memories_workspace" ON agent_memories
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "usage_tracking_workspace" ON usage_tracking
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );
