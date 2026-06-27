CREATE TABLE platform_secrets (
  key TEXT PRIMARY KEY,
  value_encrypted TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);

CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);

CREATE INDEX idx_platform_secrets_updated ON platform_secrets(updated_at DESC);
CREATE INDEX idx_platform_settings_updated ON platform_settings(updated_at DESC);
