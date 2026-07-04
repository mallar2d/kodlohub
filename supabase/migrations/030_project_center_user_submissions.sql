-- Let authenticated users submit and manage their own projects.
-- Public visibility still requires owner approval.

ALTER TABLE project_center_projects
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE project_center_projects
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE project_center_projects
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE project_center_projects
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE project_center_projects
  ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_project_center_projects_approval
  ON project_center_projects(approval_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_center_projects_created_by
  ON project_center_projects(created_by, updated_at DESC);

DROP POLICY IF EXISTS "Public can read published project center projects" ON project_center_projects;
CREATE POLICY "Public can read approved project center projects" ON project_center_projects
  FOR SELECT USING (approval_status = 'approved' AND visibility IN ('published', 'unlisted', 'archived'));

DROP POLICY IF EXISTS "Owner can manage project center projects" ON project_center_projects;
CREATE POLICY "Users can read own project center projects" ON project_center_projects
  FOR SELECT USING (
    auth.uid()::text = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  );

CREATE POLICY "Authenticated users can create project center projects" ON project_center_projects
  FOR INSERT WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Authors and owner can update project center projects" ON project_center_projects
  FOR UPDATE USING (
    auth.uid()::text = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  )
  WITH CHECK (
    auth.uid()::text = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  );

CREATE POLICY "Authors and owner can delete project center projects" ON project_center_projects
  FOR DELETE USING (
    auth.uid()::text = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
  );

DROP POLICY IF EXISTS "Owner can manage project center progress sections" ON project_center_progress_sections;
CREATE POLICY "Authors and owner can manage project center progress sections" ON project_center_progress_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  );

DROP POLICY IF EXISTS "Owner can manage project center updates" ON project_center_updates;
CREATE POLICY "Authors and owner can manage project center updates" ON project_center_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  );

DROP POLICY IF EXISTS "Owner can manage update section links" ON project_center_update_sections;
CREATE POLICY "Authors and owner can manage update section links" ON project_center_update_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_center_updates u
      JOIN project_center_projects p ON p.id = u.project_id
      WHERE u.id = update_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_center_updates u
      JOIN project_center_projects p ON p.id = u.project_id
      WHERE u.id = update_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  );

DROP POLICY IF EXISTS "Owner can manage project actions" ON project_center_actions;
CREATE POLICY "Authors and owner can manage project actions" ON project_center_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  );

DROP POLICY IF EXISTS "Owner can manage project gallery items" ON project_center_gallery_items;
CREATE POLICY "Authors and owner can manage project gallery items" ON project_center_gallery_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_center_projects p
      WHERE p.id = project_id
        AND (
          p.created_by = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
        )
    )
  );
