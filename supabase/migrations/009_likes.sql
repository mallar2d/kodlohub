-- ==========================================
-- LIKES TABLE (fixed for existing policies)
-- ==========================================

CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('post', 'media', 'lore')),
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes are viewable by everyone" ON likes;
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can like" ON likes;
CREATE POLICY "Authenticated users can like" ON likes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own likes" ON likes;
CREATE POLICY "Users can delete own likes" ON likes FOR DELETE
  USING (auth.uid()::text = user_id);

CREATE INDEX IF NOT EXISTS idx_likes_item ON likes(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
