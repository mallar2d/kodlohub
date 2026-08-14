-- ==========================================
-- URETHRA.IO LEADERBOARD & STATS TABLE
-- ==========================================
-- Глобальний лідерборд для гри Urethra.io (Slither.io у всесвіті KodloHUB).

CREATE TABLE IF NOT EXISTS public.urethra_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL DEFAULT 'Опариш',
  skin TEXT NOT NULL DEFAULT 'classic',
  score INTEGER NOT NULL DEFAULT 0,
  coffee_eaten INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.urethra_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Urethra scores viewable by everyone" ON public.urethra_scores;
CREATE POLICY "Urethra scores viewable by everyone" ON public.urethra_scores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert Urethra scores" ON public.urethra_scores;
CREATE POLICY "Anyone can insert Urethra scores" ON public.urethra_scores
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owner can delete Urethra scores" ON public.urethra_scores;
CREATE POLICY "Owner can delete Urethra scores" ON public.urethra_scores
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  );

CREATE INDEX IF NOT EXISTS idx_urethra_scores_score ON public.urethra_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_urethra_scores_coffee ON public.urethra_scores(coffee_eaten DESC);
CREATE INDEX IF NOT EXISTS idx_urethra_scores_created ON public.urethra_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_urethra_scores_user ON public.urethra_scores(user_id);
