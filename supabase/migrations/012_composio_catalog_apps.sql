CREATE TABLE composio_catalog_apps (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  glyph TEXT NOT NULL DEFAULT '?',
  bg TEXT NOT NULL DEFAULT '#444444',
  fg TEXT NOT NULL DEFAULT '#ffffff',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  updated_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_composio_catalog_apps_enabled
  ON composio_catalog_apps (is_enabled, sort_order, name);

INSERT INTO composio_catalog_apps (
  slug, name, logo_url, description, category, glyph, bg, fg, is_enabled, is_popular, sort_order
) VALUES
  ('gmail', 'Gmail', 'https://logos.composio.dev/api/gmail', 'Sync emails, send replies, and manage your inbox.', 'Communication', 'M', '#EA4335', '#fff', true, true, 1),
  ('googlecalendar', 'Google Calendar', 'https://logos.composio.dev/api/googlecalendar', 'See your schedule and let agents book meetings.', 'Productivity', '31', '#1A73E8', '#fff', true, true, 2),
  ('notion', 'Notion', 'https://logos.composio.dev/api/notion', 'Read and update tasks, docs, and databases.', 'Productivity', 'N', '#111111', '#fff', true, true, 3),
  ('slack', 'Slack', 'https://logos.composio.dev/api/slack', 'Post updates and summarize channel activity.', 'Communication', '#', '#4A154B', '#fff', true, true, 4),
  ('hubspot', 'HubSpot', 'https://logos.composio.dev/api/hubspot', 'Track deals, contacts, and pipeline stages.', 'CRM', 'H', '#FF7A59', '#fff', true, true, 5),
  ('stripe', 'Stripe', 'https://logos.composio.dev/api/stripe', 'Pull revenue, invoices, and payout data.', 'Finance', 'S', '#635BFF', '#fff', true, true, 6),
  ('github', 'GitHub', 'https://logos.composio.dev/api/github', 'Monitor issues, PRs, and repo activity.', 'Development', 'G', '#181717', '#fff', true, true, 7),
  ('asana', 'Asana', 'https://logos.composio.dev/api/asana', 'Manage projects, tasks, and assignees.', 'Productivity', 'A', '#F06A6A', '#fff', true, true, 8),
  ('salesforce', 'Salesforce', 'https://logos.composio.dev/api/salesforce', 'Sync leads, opportunities, and accounts.', 'CRM', 'SF', '#00A1E0', '#fff', true, false, 9),
  ('quickbooks', 'QuickBooks', 'https://logos.composio.dev/api/quickbooks', 'Read invoices, expenses, and P&L reports.', 'Finance', 'Q', '#2CA01C', '#fff', true, false, 10),
  ('linear', 'Linear', 'https://logos.composio.dev/api/linear', 'Track issues, cycles, and product roadmap.', 'Development', 'L', '#5E6AD2', '#fff', true, false, 11),
  ('googleanalytics', 'Google Analytics', 'https://logos.composio.dev/api/google_analytics', 'Surface traffic, conversions, and trends.', 'Analytics', 'GA', '#E37400', '#fff', true, false, 12),
  ('twitter', 'Twitter / X', 'https://logos.composio.dev/api/twitter', 'Schedule posts and track engagement.', 'Social', 'X', '#000000', '#fff', true, false, 13),
  ('dropbox', 'Dropbox', 'https://logos.composio.dev/api/dropbox', 'Access files and share documents.', 'Storage', 'D', '#0061FF', '#fff', true, false, 14),
  ('mailchimp', 'Mailchimp', 'https://logos.composio.dev/api/mailchimp', 'Manage campaigns and audience stats.', 'Analytics', 'M', '#FFE01B', '#111111', true, false, 15),
  ('zoom', 'Zoom', 'https://logos.composio.dev/api/zoom', 'Schedule calls and pull meeting recaps.', 'Communication', 'Z', '#2D8CFF', '#fff', true, false, 16),
  ('highlevel', 'HighLevel', 'https://logos.composio.dev/api/highlevel', 'Manage contacts, pipelines, calendars, and campaigns.', 'CRM', 'HL', '#FF6B35', '#fff', true, true, 17);
