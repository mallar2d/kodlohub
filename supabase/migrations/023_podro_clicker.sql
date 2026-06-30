-- ==========================================
-- ПОДРО-КЛІКЕР — прогрес гравця + глобальний лідерборд
-- ==========================================

CREATE TABLE IF NOT EXISTS podro_clicker_progress (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  grams DOUBLE PRECISION NOT NULL DEFAULT 0,
  career_grams DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_clicks BIGINT NOT NULL DEFAULT 0,
  helpers JSONB NOT NULL DEFAULT '{}'::JSONB,
  upgrades TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  achievements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  respect_points DOUBLE PRECISION NOT NULL DEFAULT 0,
  prestige_count INTEGER NOT NULL DEFAULT 0,
  last_tick_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE podro_clicker_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Podro clicker owner read" ON podro_clicker_progress;
CREATE POLICY "Podro clicker owner read" ON podro_clicker_progress FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Podro clicker owner insert" ON podro_clicker_progress;
CREATE POLICY "Podro clicker owner insert" ON podro_clicker_progress FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Podro clicker owner update" ON podro_clicker_progress;
CREATE POLICY "Podro clicker owner update" ON podro_clicker_progress FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Лідерборд за заробленою за все життя кавою (career_grams).
CREATE OR REPLACE VIEW podro_clicker_leaderboard AS
SELECT
  user_id,
  career_grams,
  respect_points,
  prestige_count
FROM podro_clicker_progress
ORDER BY career_grams DESC;

CREATE INDEX IF NOT EXISTS idx_podro_clicker_career_grams ON podro_clicker_progress(career_grams DESC);
