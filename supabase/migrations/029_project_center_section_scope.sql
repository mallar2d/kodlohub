-- Distinguish core project readiness from future update/release work.
ALTER TABLE project_center_progress_sections
  ADD COLUMN IF NOT EXISTS section_scope TEXT NOT NULL DEFAULT 'project'
  CHECK (section_scope IN ('project', 'update', 'internal'));

CREATE INDEX IF NOT EXISTS idx_project_center_sections_scope
  ON project_center_progress_sections(project_id, section_scope, sort_order);
