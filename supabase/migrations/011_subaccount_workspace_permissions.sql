-- Scope subaccount permissions per workspace so one user can be a guest in many workspaces.

ALTER TABLE subaccount_permissions
  DROP CONSTRAINT IF EXISTS subaccount_permissions_subaccount_id_key;

ALTER TABLE subaccount_permissions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Legacy rows (if any) cannot be mapped safely; table was unused in application code.
DELETE FROM subaccount_permissions WHERE workspace_id IS NULL;

ALTER TABLE subaccount_permissions
  ALTER COLUMN workspace_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subaccount_permissions_workspace_user
  ON subaccount_permissions (subaccount_id, workspace_id);

ALTER TABLE subaccount_permissions
  DROP CONSTRAINT IF EXISTS subaccount_permissions_user_workspace_unique;

ALTER TABLE subaccount_permissions
  ADD CONSTRAINT subaccount_permissions_user_workspace_unique
  UNIQUE (subaccount_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_subaccount_permissions_workspace
  ON subaccount_permissions (workspace_id);
