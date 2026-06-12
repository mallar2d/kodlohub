-- ==========================================
-- BRAT TD LEADERBOARD TABLE
-- ==========================================
-- Глобальний лідерборд для гри BRAT TD.
-- Кожен залогінений юзер може зберегти свій результат.
-- Лідерборд = TOP 10 за score DESC.

CREATE TABLE IF NOT EXISTS brat_td_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL DEFAULT 'Анонім',
  score INTEGER NOT NULL,
  wave INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brat_td_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "BRAT TD scores viewable by everyone" ON brat_td_scores;
CREATE POLICY "BRAT TD scores viewable by everyone" ON brat_td_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert BRAT TD scores" ON brat_td_scores;
CREATE POLICY "Authenticated users can insert BRAT TD scores" ON brat_td_scores FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Only owner can delete (for moderation)
DROP POLICY IF EXISTS "Owner can delete BRAT TD scores" ON brat_td_scores;
CREATE POLICY "Owner can delete BRAT TD scores" ON brat_td_scores FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'));

CREATE INDEX IF NOT EXISTS idx_brat_td_scores_score ON brat_td_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_brat_td_scores_user ON brat_td_scores(user_id);

-- Seed default entry for Петро Хоменко (if profile exists)
-- This will be handled by the API on first load instead.
