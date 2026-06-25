INSERT INTO packs (name, slug, description, price_monthly, price_yearly, sort_order, is_public) VALUES
  ('Free', 'free', 'Get started with Monzi', 0, 0, 0, true),
  ('Starter', 'starter', 'For individuals getting productive', 19, 190, 1, true),
  ('Pro', 'pro', 'For power users and small teams', 49, 490, 2, true),
  ('Business', 'business', 'For teams and agencies', 99, 990, 3, true);

INSERT INTO pack_limits (pack_id, max_agents, max_subaccounts, ai_messages_per_month, ai_messages_per_day, max_dashboards, max_widgets_per_dashboard, max_integrations, voice_enabled, custom_avatar_enabled, storage_mb, support_level)
SELECT id, 1,  0,  50,    10,  1, 5,  3,  false, false, 100,  'community' FROM packs WHERE slug = 'free'
UNION ALL
SELECT id, 3,  2,  500,   50,  3, 15, 5,  true,  false, 1000, 'email'     FROM packs WHERE slug = 'starter'
UNION ALL
SELECT id, 10, 5,  2000,  200, 10, 30, 20, true,  true,  10000,'chat'     FROM packs WHERE slug = 'pro'
UNION ALL
SELECT id, -1, 20, -1,    -1,  -1, -1, -1, true,  true, 100000,'dedicated' FROM packs WHERE slug = 'business';

INSERT INTO features (key, name, description) VALUES
  ('voice', 'Voice Mode', 'Talk to your agents'),
  ('custom_avatar', 'Custom Avatars', 'Upload or customize agent avatars'),
  ('api_access', 'API Access', 'Programmatic access to your agents'),
  ('white_label', 'White Label', 'Remove Monzi branding'),
  ('advanced_memory', 'Advanced Memory', 'Extended long-term memory'),
  ('priority_ai', 'Priority AI', 'Faster AI responses with GPT-4o');
