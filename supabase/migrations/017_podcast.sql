-- ==========================================
-- КОДЛОКАСТ — Podcast system
-- ==========================================

CREATE TABLE IF NOT EXISTS podcast_episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  audio_url TEXT NOT NULL,
  duration INT DEFAULT 0,
  episode_number INT NOT NULL,
  author_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS podcast_settings (
  id INT PRIMARY KEY DEFAULT 1,
  background_track_url TEXT DEFAULT '',
  background_volume FLOAT DEFAULT 0.3,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO podcast_settings (id, background_track_url) VALUES (1, '/background.mp3') ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_settings ENABLE ROW LEVEL SECURITY;

-- Episodes: everyone can read, admins can CRUD
DROP POLICY IF EXISTS "Podcast episodes are viewable by everyone" ON podcast_episodes;
CREATE POLICY "Podcast episodes are viewable by everyone" ON podcast_episodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert podcast episodes" ON podcast_episodes;
CREATE POLICY "Admins can insert podcast episodes" ON podcast_episodes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

DROP POLICY IF EXISTS "Admins can update podcast episodes" ON podcast_episodes;
CREATE POLICY "Admins can update podcast episodes" ON podcast_episodes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

DROP POLICY IF EXISTS "Admins can delete podcast episodes" ON podcast_episodes;
CREATE POLICY "Admins can delete podcast episodes" ON podcast_episodes FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Settings: everyone can read, admins can update
DROP POLICY IF EXISTS "Podcast settings are viewable by everyone" ON podcast_settings;
CREATE POLICY "Podcast settings are viewable by everyone" ON podcast_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update podcast settings" ON podcast_settings;
CREATE POLICY "Admins can update podcast settings" ON podcast_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_number ON podcast_episodes(episode_number DESC);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_published ON podcast_episodes(is_published);
