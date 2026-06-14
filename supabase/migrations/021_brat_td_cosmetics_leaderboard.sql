-- ==========================================
-- BRAT TD COSMETICS + LEADERBOARD 2.0
-- ==========================================

ALTER TABLE brat_td_progress
  ADD COLUMN IF NOT EXISTS unlocked_titles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS unlocked_frames TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS unlocked_effects TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS active_title TEXT,
  ADD COLUMN IF NOT EXISTS active_frame TEXT,
  ADD COLUMN IF NOT EXISTS active_effect TEXT;

ALTER TABLE brat_td_scores
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS is_endless BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS version TEXT,
  ADD COLUMN IF NOT EXISTS active_title TEXT,
  ADD COLUMN IF NOT EXISTS active_frame TEXT,
  ADD COLUMN IF NOT EXISTS map_id TEXT;

CREATE INDEX IF NOT EXISTS idx_brat_td_scores_endless_wave ON brat_td_scores(is_endless, wave DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_brat_td_scores_difficulty_wave ON brat_td_scores(difficulty, wave DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_brat_td_scores_fastest_victory ON brat_td_scores(duration_seconds ASC) WHERE wave >= 46 AND duration_seconds IS NOT NULL;
