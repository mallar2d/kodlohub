-- ==========================================
-- BRAT TD PROGRESSION TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS brat_td_progress (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  player_level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  unlocked_towers TEXT[] NOT NULL DEFAULT ARRAY['hammer','boomerang'],
  achievements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bonus_start_gold INTEGER NOT NULL DEFAULT 0,
  bonus_lives INTEGER NOT NULL DEFAULT 0,
  map_completions JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brat_td_tower_mastery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tower_key TEXT NOT NULL,
  tower_xp NUMERIC NOT NULL DEFAULT 0,
  unlocked_tiers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  highest_tier_achieved INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tower_key)
);

CREATE TABLE IF NOT EXISTS brat_td_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE brat_td_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE brat_td_tower_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE brat_td_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "BRAT TD progress owner read" ON brat_td_progress;
CREATE POLICY "BRAT TD progress owner read" ON brat_td_progress FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "BRAT TD progress owner insert" ON brat_td_progress;
CREATE POLICY "BRAT TD progress owner insert" ON brat_td_progress FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "BRAT TD progress owner update" ON brat_td_progress;
CREATE POLICY "BRAT TD progress owner update" ON brat_td_progress FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "BRAT TD mastery owner read" ON brat_td_tower_mastery;
CREATE POLICY "BRAT TD mastery owner read" ON brat_td_tower_mastery FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "BRAT TD mastery owner insert" ON brat_td_tower_mastery;
CREATE POLICY "BRAT TD mastery owner insert" ON brat_td_tower_mastery FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "BRAT TD mastery owner update" ON brat_td_tower_mastery;
CREATE POLICY "BRAT TD mastery owner update" ON brat_td_tower_mastery FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "BRAT TD achievement owner read" ON brat_td_achievements;
CREATE POLICY "BRAT TD achievement owner read" ON brat_td_achievements FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "BRAT TD achievement owner insert" ON brat_td_achievements;
CREATE POLICY "BRAT TD achievement owner insert" ON brat_td_achievements FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE INDEX IF NOT EXISTS idx_brat_td_tower_mastery_user ON brat_td_tower_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_brat_td_achievements_user ON brat_td_achievements(user_id);
