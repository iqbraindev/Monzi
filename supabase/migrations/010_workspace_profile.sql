-- Workspace profile: description, activity domain, logo

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS activity_domain TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

NOTIFY pgrst, 'reload schema';
