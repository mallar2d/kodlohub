-- ==========================================
-- KODLOHOST — Initial Database Schema
-- ==========================================

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Posts (blog + lore + events)
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

-- Media (photos, videos, documents)
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

-- Lore items (structured archive)
CREATE TABLE IF NOT EXISTS lore_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('person', 'event', 'artifact', 'meme', 'quote')),
  media_id UUID REFERENCES media(id),
  author_id TEXT REFERENCES profiles(id),
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

-- Profiles: everyone can read, only owner can update
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Posts: everyone can read, only author can insert/update/delete
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE USING (auth.uid()::text = author_id);

CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE USING (auth.uid()::text = author_id);

-- Media: everyone can read, only author can insert/delete
CREATE POLICY "Media is viewable by everyone"
  ON media FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload media"
  ON media FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can delete own media"
  ON media FOR DELETE USING (auth.uid()::text = author_id);

-- Comments: everyone can read, only author can insert/delete
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE USING (auth.uid()::text = author_id);

-- Lore items: everyone can read, authenticated can create
CREATE POLICY "Lore items are viewable by everyone"
  ON lore_items FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create lore items"
  ON lore_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can update own lore items"
  ON lore_items FOR UPDATE USING (auth.uid()::text = author_id);

CREATE POLICY "Authors can delete own lore items"
  ON lore_items FOR DELETE USING (auth.uid()::text = author_id);

-- ==========================================
-- Storage
-- ==========================================
-- Create storage bucket (run in Supabase Dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('media', 'media', true, 104857600,
--   ARRAY['image/*', 'video/*', 'application/pdf', 'text/*']);
