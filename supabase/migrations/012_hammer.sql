-- ==========================================
-- HAMMER HITS TABLE
-- ==========================================
-- Глобальна гра: кожен юзер може вдарити молотком раз на годину.
-- Рахунок є загальний (total) і особистий (per-user).
-- Лідерборд = COUNT GROUP BY user_id ORDER BY count DESC.

CREATE TABLE IF NOT EXISTS hammer_hits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  hit_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hammer_hits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hammer hits are viewable by everyone" ON hammer_hits;
CREATE POLICY "Hammer hits are viewable by everyone" ON hammer_hits FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert own hammer hits" ON hammer_hits;
CREATE POLICY "Authenticated users can insert own hammer hits" ON hammer_hits FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Немає UPDATE / DELETE — історичні удари не редагуються.
-- Захист від накрутки через server-side перевірку кулдауну в /api/hammer POST.

CREATE INDEX IF NOT EXISTS idx_hammer_hits_user ON hammer_hits(user_id);
CREATE INDEX IF NOT EXISTS idx_hammer_hits_user_hit ON hammer_hits(user_id, hit_at DESC);
CREATE INDEX IF NOT EXISTS idx_hammer_hits_hit_at ON hammer_hits(hit_at DESC);
