-- ==========================================
-- BRAT TD — пропозиції оновлень / ідей
-- ==========================================

CREATE TABLE IF NOT EXISTS brat_td_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES profiles(id)
);

ALTER TABLE brat_td_suggestions ENABLE ROW LEVEL SECURITY;

-- Авторизовані користувачі можуть надсилати свої пропозиції
CREATE POLICY "Users can create own brat td suggestions" ON brat_td_suggestions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Користувачі бачать свої пропозиції
CREATE POLICY "Users see own brat td suggestions" ON brat_td_suggestions
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Головний Подро бачить усі пропозиції
CREATE POLICY "Owner sees all brat td suggestions" ON brat_td_suggestions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  );

-- Головний Подро може оновлювати статус
CREATE POLICY "Owner can update brat td suggestions" ON brat_td_suggestions
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  );

CREATE INDEX IF NOT EXISTS idx_brat_td_suggestions_status ON brat_td_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_brat_td_suggestions_user ON brat_td_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_brat_td_suggestions_created ON brat_td_suggestions(created_at DESC);
