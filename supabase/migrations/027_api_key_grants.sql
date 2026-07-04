-- Owner-granted permission to create API keys (not available to everyone)
CREATE TABLE IF NOT EXISTS api_key_grants (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  allowed_scopes TEXT[] NOT NULL DEFAULT '{read}',
  max_rate_limit_per_minute INT NOT NULL DEFAULT 60 CHECK (max_rate_limit_per_minute BETWEEN 1 AND 1000),
  allow_admin_scope BOOLEAN NOT NULL DEFAULT false,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_key_grants_active ON api_key_grants(user_id) WHERE revoked_at IS NULL;

ALTER TABLE api_key_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct client access to api_key_grants" ON api_key_grants;
CREATE POLICY "No direct client access to api_key_grants" ON api_key_grants FOR ALL USING (false);
