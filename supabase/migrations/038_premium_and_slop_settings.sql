-- Migration 038: KodloHUB Premium and Slop Fund Settings

-- 1. Add is_premium to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- 2. Create site_settings table for global configurations (e.g. slop fund progress)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS for site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site_settings"
  ON site_settings FOR SELECT
  USING (true);

CREATE POLICY "Owners and Podrofikovany can insert/update site_settings"
  ON site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()::text
      AND profiles.role IN ('owner', 'podrofikovany')
    )
  );

-- 4. Insert default slop fund data
INSERT INTO site_settings (key, value)
VALUES (
  'slop_fund',
  '{"collected": 148.80, "goal": 400.00, "updated_at": "2026-08-31T00:00:00Z"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
