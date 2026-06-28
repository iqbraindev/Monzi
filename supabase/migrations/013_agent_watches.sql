-- Proactive agent watches, trigger events, and in-app notifications

CREATE TABLE agent_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  condition_nl TEXT NOT NULL,
  toolkit TEXT NOT NULL,
  poll_tool TEXT NOT NULL,
  poll_params JSONB NOT NULL DEFAULT '{}',
  cursor JSONB NOT NULL DEFAULT '{"type":"timestamp","value":null,"field":"timestamp"}',
  notify_via TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'needs_connection', 'expired')),
  expires_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_watches_workspace ON agent_watches(workspace_id);
CREATE INDEX idx_agent_watches_status_poll ON agent_watches(status, last_checked_at NULLS FIRST)
  WHERE status = 'active';

CREATE TABLE watch_trigger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id UUID NOT NULL REFERENCES agent_watches(id) ON DELETE CASCADE,
  source_item_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  raw_snapshot JSONB,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watch_id, source_item_id)
);

CREATE INDEX idx_watch_trigger_events_watch ON watch_trigger_events(watch_id);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'watch'
    CHECK (type IN ('watch', 'insight', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_workspace_user ON notifications(workspace_id, user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(workspace_id, user_id)
  WHERE read_at IS NULL;

CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email BOOLEAN NOT NULL DEFAULT true,
  push BOOLEAN NOT NULL DEFAULT true,
  proactive BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pack_limits ADD COLUMN IF NOT EXISTS max_active_watches INT NOT NULL DEFAULT 2;

UPDATE pack_limits pl
SET max_active_watches = v.max_active_watches
FROM packs p,
LATERAL (
  SELECT CASE p.slug
    WHEN 'free' THEN 2
    WHEN 'starter' THEN 5
    WHEN 'pro' THEN 20
    WHEN 'business' THEN -1
    ELSE 2
  END AS max_active_watches
) v
WHERE pl.pack_id = p.id;

-- RLS
ALTER TABLE agent_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_trigger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_watches_workspace" ON agent_watches
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "watch_trigger_events_via_watch" ON watch_trigger_events
  FOR ALL USING (
    watch_id IN (
      SELECT w.id FROM agent_watches w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE wm.user_id = auth.uid()::text
    )
  );

CREATE POLICY "notifications_workspace" ON notifications
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "notification_preferences_self" ON notification_preferences
  FOR ALL USING (user_id = auth.uid()::text);
