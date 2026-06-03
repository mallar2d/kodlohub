-- ==========================================
-- КОДЛОПЕДІЯ — Wiki system
-- ==========================================

-- Wiki categories
CREATE TABLE IF NOT EXISTS wiki_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '📄',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wiki articles
CREATE TABLE IF NOT EXISTS wiki_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES wiki_categories(id) ON DELETE SET NULL,
  author_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wiki revisions (edit history)
CREATE TABLE IF NOT EXISTS wiki_revisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES wiki_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  author_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  edit_comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE wiki_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_revisions ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read, admins can CRUD
CREATE POLICY "Wiki categories are viewable by everyone" ON wiki_categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert wiki categories" ON wiki_categories FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

CREATE POLICY "Admins can update wiki categories" ON wiki_categories FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

CREATE POLICY "Admins can delete wiki categories" ON wiki_categories FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Articles: everyone can read, admins can CRUD
CREATE POLICY "Wiki articles are viewable by everyone" ON wiki_articles FOR SELECT USING (true);

CREATE POLICY "Admins can insert wiki articles" ON wiki_articles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

CREATE POLICY "Admins can update wiki articles" ON wiki_articles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

CREATE POLICY "Admins can delete wiki articles" ON wiki_articles FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Revisions: everyone can read, admins can insert
CREATE POLICY "Wiki revisions are viewable by everyone" ON wiki_revisions FOR SELECT USING (true);

CREATE POLICY "Admins can insert wiki revisions" ON wiki_revisions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wiki_articles_slug ON wiki_articles(slug);
CREATE INDEX IF NOT EXISTS idx_wiki_articles_category ON wiki_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_wiki_articles_published ON wiki_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_wiki_revisions_article ON wiki_revisions(article_id, created_at DESC);

-- Seed default categories
INSERT INTO wiki_categories (name, slug, description, icon, sort_order) VALUES
  ('Загальне', 'general', 'Загальна інформація про спільноту', '📋', 1),
  ('Персони', 'persons', 'Статті про учасників та їх досягнення', '👤', 2),
  ('Події', 'events', 'Важливі події та моменти', '📅', 3),
  ('Артефакти', 'artifacts', 'Описи важливих об''єктів та традицій', '🏆', 4),
  ('Гайди', 'guides', 'Інструкції та поради', '📖', 5),
  ('Меми', 'memes', 'Внутрішні меми та жарти', '😂', 6)
ON CONFLICT (slug) DO NOTHING;
