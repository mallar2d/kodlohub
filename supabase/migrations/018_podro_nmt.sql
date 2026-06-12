-- ==========================================
-- ПОДРО-НМТ — Quiz and Leaderboard System
-- ==========================================

CREATE TABLE IF NOT EXISTS podro_nmt_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  score INT NOT NULL,
  correct_answers INT NOT NULL,
  total_questions INT NOT NULL,
  time_taken_seconds INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE podro_nmt_results ENABLE ROW LEVEL SECURITY;

-- Everyone can view leaderboard/results
DROP POLICY IF EXISTS "NMT results are viewable by everyone" ON podro_nmt_results;
CREATE POLICY "NMT results are viewable by everyone" ON podro_nmt_results FOR SELECT
  USING (true);

-- Authenticated users can insert their own results (only if they don't have one already, enforced by UNIQUE constraint)
DROP POLICY IF EXISTS "Users can insert own NMT result" ON podro_nmt_results;
CREATE POLICY "Users can insert own NMT result" ON podro_nmt_results FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- User rank in NMT
CREATE OR REPLACE FUNCTION podro_nmt_user_rank(p_user_id TEXT)
RETURNS INTEGER AS $$
  WITH ranked AS (
    SELECT user_id, RANK() OVER (ORDER BY score DESC, time_taken_seconds ASC, completed_at ASC) AS rank
    FROM podro_nmt_results
  )
  SELECT rank::INTEGER FROM ranked WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_podro_nmt_results_score ON podro_nmt_results(score DESC, time_taken_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_podro_nmt_results_user ON podro_nmt_results(user_id);
