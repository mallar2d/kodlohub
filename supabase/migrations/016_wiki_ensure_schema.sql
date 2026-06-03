-- Ensure slug column exists on wiki_articles (in case table was created before 015)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wiki_articles' AND column_name = 'slug'
  ) THEN
    ALTER TABLE wiki_articles ADD COLUMN slug TEXT NOT NULL DEFAULT '';
    ALTER TABLE wiki_articles ADD CONSTRAINT wiki_articles_slug_unique UNIQUE (slug);
    CREATE INDEX IF NOT EXISTS idx_wiki_articles_slug ON wiki_articles(slug);
  END IF;
END $$;

-- Also ensure other columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wiki_articles' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE wiki_articles ADD COLUMN is_published BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wiki_articles' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE wiki_articles ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wiki_articles' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE wiki_articles ADD COLUMN view_count INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wiki_articles' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE wiki_articles ADD COLUMN category_id UUID REFERENCES wiki_categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wiki_articles' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE wiki_articles ADD COLUMN author_id TEXT REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wiki_articles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE wiki_articles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Ensure wiki_revisions table exists
CREATE TABLE IF NOT EXISTS wiki_revisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES wiki_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  author_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  edit_comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure wiki_categories table exists
CREATE TABLE IF NOT EXISTS wiki_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '📄',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE wiki_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_revisions ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read, admins can CRUD
DROP POLICY IF EXISTS "Wiki categories are viewable by everyone" ON wiki_categories;
CREATE POLICY "Wiki categories are viewable by everyone" ON wiki_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert wiki categories" ON wiki_categories;
CREATE POLICY "Admins can insert wiki categories" ON wiki_categories FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

DROP POLICY IF EXISTS "Admins can update wiki categories" ON wiki_categories;
CREATE POLICY "Admins can update wiki categories" ON wiki_categories FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

DROP POLICY IF EXISTS "Admins can delete wiki categories" ON wiki_categories;
CREATE POLICY "Admins can delete wiki categories" ON wiki_categories FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Articles: everyone can read, admins can CRUD
DROP POLICY IF EXISTS "Wiki articles are viewable by everyone" ON wiki_articles;
CREATE POLICY "Wiki articles are viewable by everyone" ON wiki_articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert wiki articles" ON wiki_articles;
CREATE POLICY "Admins can insert wiki articles" ON wiki_articles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

DROP POLICY IF EXISTS "Admins can update wiki articles" ON wiki_articles;
CREATE POLICY "Admins can update wiki articles" ON wiki_articles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

DROP POLICY IF EXISTS "Admins can delete wiki articles" ON wiki_articles;
CREATE POLICY "Admins can delete wiki articles" ON wiki_articles FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Revisions: everyone can read, admins can insert
DROP POLICY IF EXISTS "Wiki revisions are viewable by everyone" ON wiki_revisions;
CREATE POLICY "Wiki revisions are viewable by everyone" ON wiki_revisions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert wiki revisions" ON wiki_revisions;
CREATE POLICY "Admins can insert wiki revisions" ON wiki_revisions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wiki_articles_slug ON wiki_articles(slug);
CREATE INDEX IF NOT EXISTS idx_wiki_articles_category ON wiki_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_wiki_articles_published ON wiki_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_wiki_revisions_article ON wiki_revisions(article_id, created_at DESC);
