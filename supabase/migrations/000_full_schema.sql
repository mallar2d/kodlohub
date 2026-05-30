-- ==========================================
-- KODLOHOST — FULL SCHEMA (одна міграція)
-- ==========================================

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'shemetovany' CHECK (role IN ('owner', 'podrofikovany', 'kodlo', 'shemetovany')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  type TEXT DEFAULT 'blog' CHECK (type IN ('blog', 'lore', 'event')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Media
CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'video', 'document')),
  file_size BIGINT,
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lore items
CREATE TABLE IF NOT EXISTS lore_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('person', 'event', 'artifact', 'meme', 'quote')),
  media_id UUID REFERENCES media(id),
  author_id TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'post_approved', 'post_rejected', 'role_changed', 'post_deleted', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- RLS Policies
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lore_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can update own or owner can update all" ON profiles FOR UPDATE USING (
  auth.uid()::text = id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  OR (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'podrofikovany')
    AND role IN ('kodlo', 'shemetovany')
  )
);

CREATE POLICY "Owner can delete any profile" ON profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  OR (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'podrofikovany')
    AND role IN ('kodlo', 'shemetovany')
  )
);

-- Posts
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);

CREATE POLICY "Kodlo and above can create posts" ON posts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany', 'kodlo'))
  );

CREATE POLICY "Authors can update own posts" ON posts FOR UPDATE USING (auth.uid()::text = author_id);

CREATE POLICY "Authors can delete own posts" ON posts FOR DELETE USING (auth.uid()::text = author_id);

-- Media
CREATE POLICY "Media is viewable by everyone" ON media FOR SELECT USING (true);

CREATE POLICY "Kodlo and above can upload media" ON media FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany', 'kodlo'))
  );

CREATE POLICY "Authors can delete own media" ON media FOR DELETE USING (auth.uid()::text = author_id);

-- Comments
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can delete own comments" ON comments FOR DELETE USING (auth.uid()::text = author_id);

-- Lore items
CREATE POLICY "Lore items are viewable by everyone" ON lore_items FOR SELECT USING (true);

CREATE POLICY "Kodlo and above can create lore items" ON lore_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany', 'kodlo'))
  );

CREATE POLICY "Authors can update own lore items" ON lore_items FOR UPDATE USING (auth.uid()::text = author_id);

CREATE POLICY "Authors can delete own lore items" ON lore_items FOR DELETE USING (auth.uid()::text = author_id);

-- Notifications
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Authenticated can create notifications" ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can mark own as read" ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE
  USING (auth.uid()::text = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ==========================================
-- Storage (Cloudflare R2 налаштовується окремо)
-- ==========================================
