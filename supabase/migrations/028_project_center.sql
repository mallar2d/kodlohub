-- ==========================================
-- PROJECT CENTER
-- Generic project/devlog/progress hub for KodloHub.
-- ==========================================

CREATE TABLE IF NOT EXISTS project_center_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  one_liner TEXT DEFAULT '',
  short_description TEXT NOT NULL,
  full_description_markdown TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'prototype', 'active', 'paused', 'maintained', 'finished', 'archived', 'cancelled', 'abandoned')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('main_focus', 'high', 'medium', 'low', 'frozen', 'experimental', 'archival')),
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'published', 'hidden', 'unlisted', 'archived')),
  types TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  accent_color TEXT DEFAULT '#ffffff',
  cover_image_url TEXT,
  hero_image_url TEXT,
  logo_url TEXT,
  social_image_url TEXT,
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  progress_mode TEXT DEFAULT 'auto' CHECK (progress_mode IN ('auto', 'manual')),
  is_featured BOOLEAN DEFAULT false,
  pinned_notice_title TEXT,
  pinned_notice_body TEXT,
  private_notes TEXT,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_center_progress_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES project_center_projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES project_center_progress_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  progress_mode TEXT DEFAULT 'manual' CHECK (progress_mode IN ('auto', 'manual')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'partial', 'nearly_done', 'done', 'needs_rework', 'blocked', 'issue', 'deferred')),
  weight NUMERIC DEFAULT 1 CHECK (weight > 0),
  section_scope TEXT NOT NULL DEFAULT 'project' CHECK (section_scope IN ('project', 'update', 'internal')),
  is_public BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, parent_id, slug)
);

CREATE TABLE IF NOT EXISTS project_center_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES project_center_projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  body_markdown TEXT NOT NULL DEFAULT '',
  update_type TEXT NOT NULL DEFAULT 'devlog' CHECK (update_type IN ('devlog', 'patch_note', 'release', 'announcement', 'screenshot_drop', 'progress_update', 'technical_update', 'localization_update', 'roadmap_update', 'delay_notice', 'pause_notice', 'archive_note', 'hotfix', 'milestone_reached')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden', 'archived')),
  cover_image_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  progress_changes JSONB DEFAULT '{}',
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, slug)
);

CREATE TABLE IF NOT EXISTS project_center_update_sections (
  update_id UUID NOT NULL REFERENCES project_center_updates(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES project_center_progress_sections(id) ON DELETE CASCADE,
  PRIMARY KEY (update_id, section_id)
);

CREATE TABLE IF NOT EXISTS project_center_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES project_center_projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'read_more' CHECK (action_type IN ('play', 'download', 'github', 'website', 'documentation', 'steam', 'discord', 'trailer', 'mod_page', 'install_guide', 'read_more', 'support', 'changelog')),
  icon TEXT DEFAULT '',
  style TEXT NOT NULL DEFAULT 'secondary' CHECK (style IN ('primary', 'secondary', 'danger', 'ghost')),
  open_new_tab BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, label)
);

CREATE TABLE IF NOT EXISTS project_center_gallery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES project_center_projects(id) ON DELETE CASCADE,
  update_id UUID REFERENCES project_center_updates(id) ON DELETE SET NULL,
  media_id UUID REFERENCES media(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'video', 'embed')),
  role TEXT NOT NULL DEFAULT 'screenshot' CHECK (role IN ('screenshot', 'cover', 'logo', 'concept', 'old_screenshot', 'comparison', 'trailer', 'social_preview', 'other')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT true,
  is_hero BOOLEAN DEFAULT false,
  is_social_preview BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_project_center_public_action_limit()
RETURNS trigger AS $$
DECLARE
  public_count INT;
BEGIN
  IF NEW.is_public THEN
    SELECT COUNT(*) INTO public_count
    FROM project_center_actions
    WHERE project_id = NEW.project_id
      AND is_public = true
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF public_count >= 3 THEN
      RAISE EXCEPTION 'Project Center allows at most 3 public action buttons per project';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_center_public_action_limit ON project_center_actions;
CREATE TRIGGER trg_project_center_public_action_limit
BEFORE INSERT OR UPDATE ON project_center_actions
FOR EACH ROW EXECUTE FUNCTION enforce_project_center_public_action_limit();

CREATE OR REPLACE FUNCTION touch_project_center_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_center_projects_updated_at ON project_center_projects;
CREATE TRIGGER trg_project_center_projects_updated_at
BEFORE UPDATE ON project_center_projects
FOR EACH ROW EXECUTE FUNCTION touch_project_center_updated_at();

DROP TRIGGER IF EXISTS trg_project_center_sections_updated_at ON project_center_progress_sections;
CREATE TRIGGER trg_project_center_sections_updated_at
BEFORE UPDATE ON project_center_progress_sections
FOR EACH ROW EXECUTE FUNCTION touch_project_center_updated_at();

DROP TRIGGER IF EXISTS trg_project_center_updates_updated_at ON project_center_updates;
CREATE TRIGGER trg_project_center_updates_updated_at
BEFORE UPDATE ON project_center_updates
FOR EACH ROW EXECUTE FUNCTION touch_project_center_updated_at();

DROP TRIGGER IF EXISTS trg_project_center_actions_updated_at ON project_center_actions;
CREATE TRIGGER trg_project_center_actions_updated_at
BEFORE UPDATE ON project_center_actions
FOR EACH ROW EXECUTE FUNCTION touch_project_center_updated_at();

DROP TRIGGER IF EXISTS trg_project_center_gallery_updated_at ON project_center_gallery_items;
CREATE TRIGGER trg_project_center_gallery_updated_at
BEFORE UPDATE ON project_center_gallery_items
FOR EACH ROW EXECUTE FUNCTION touch_project_center_updated_at();

ALTER TABLE project_center_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_center_progress_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_center_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_center_update_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_center_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_center_gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published project center projects" ON project_center_projects
  FOR SELECT USING (visibility IN ('published', 'unlisted', 'archived'));

CREATE POLICY "Owner can manage project center projects" ON project_center_projects
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'));

CREATE POLICY "Public can read public progress sections" ON project_center_progress_sections
  FOR SELECT USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id AND p.visibility IN ('published', 'unlisted', 'archived')
    )
  );

CREATE POLICY "Owner can manage project center progress sections" ON project_center_progress_sections
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'));

CREATE POLICY "Public can read published project updates" ON project_center_updates
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id AND p.visibility IN ('published', 'unlisted', 'archived')
    )
  );

CREATE POLICY "Owner can manage project center updates" ON project_center_updates
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'));

CREATE POLICY "Public can read update section links for visible content" ON project_center_update_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_center_updates u
      JOIN project_center_projects p ON p.id = u.project_id
      WHERE u.id = update_id AND u.status = 'published' AND p.visibility IN ('published', 'unlisted', 'archived')
    )
  );

CREATE POLICY "Owner can manage update section links" ON project_center_update_sections
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'));

CREATE POLICY "Public can read public project actions" ON project_center_actions
  FOR SELECT USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id AND p.visibility IN ('published', 'unlisted', 'archived')
    )
  );

CREATE POLICY "Owner can manage project actions" ON project_center_actions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'));

CREATE POLICY "Public can read public gallery items" ON project_center_gallery_items
  FOR SELECT USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id AND p.visibility IN ('published', 'unlisted', 'archived')
    )
  );

CREATE POLICY "Owner can manage project gallery items" ON project_center_gallery_items
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner'));

CREATE INDEX IF NOT EXISTS idx_project_center_projects_slug ON project_center_projects(slug);
CREATE INDEX IF NOT EXISTS idx_project_center_projects_visibility ON project_center_projects(visibility);
CREATE INDEX IF NOT EXISTS idx_project_center_projects_status ON project_center_projects(status);
CREATE INDEX IF NOT EXISTS idx_project_center_projects_priority ON project_center_projects(priority);
CREATE INDEX IF NOT EXISTS idx_project_center_sections_project ON project_center_progress_sections(project_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_center_updates_project ON project_center_updates(project_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_center_updates_status ON project_center_updates(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_center_actions_project ON project_center_actions(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_center_gallery_project ON project_center_gallery_items(project_id, sort_order);
