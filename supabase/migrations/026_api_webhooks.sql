-- Extend API keys with service account for write operations
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS service_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL;

-- Webhook subscriptions for external integrations
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_api_key ON webhook_subscriptions(api_key_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(active) WHERE active = true;

ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct client access to webhooks" ON webhook_subscriptions;
CREATE POLICY "No direct client access to webhooks" ON webhook_subscriptions FOR ALL USING (false);
