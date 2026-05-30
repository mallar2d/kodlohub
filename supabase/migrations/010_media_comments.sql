-- ==========================================
-- MEDIA COMMENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS media_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE media_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can see media comments
CREATE POLICY "Media comments are viewable by everyone" ON media_comments FOR SELECT USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create media comments" ON media_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authors can delete own comments
CREATE POLICY "Authors can delete own media comments" ON media_comments FOR DELETE
  USING (auth.uid()::text = author_id);

CREATE INDEX IF NOT EXISTS idx_media_comments_media ON media_comments(media_id);
