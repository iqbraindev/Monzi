ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid()::text = id);

CREATE POLICY "agents_owner" ON agents
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "dashboards_owner" ON dashboards
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "widgets_via_dashboard" ON widgets
  FOR ALL USING (
    dashboard_id IN (
      SELECT id FROM dashboards WHERE user_id = auth.uid()::text
    )
  );
