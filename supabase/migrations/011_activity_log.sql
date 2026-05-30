-- ==========================================
-- ACTIVITY LOG TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view activity log" ON activity_log;
CREATE POLICY "Admins can view activity log" ON activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text
      AND role IN ('owner', 'podrofikovany')
    )
  );

DROP POLICY IF EXISTS "Service role can insert activity" ON activity_log;
CREATE POLICY "Service role can insert activity" ON activity_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
