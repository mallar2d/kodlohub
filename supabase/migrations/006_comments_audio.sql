-- ==========================================
-- KODLOHOST — Comments, Audio type, formatting fix
-- ==========================================

-- 1. Додати audio до media table
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_file_type_check;
ALTER TABLE media ADD CONSTRAINT media_file_type_check
  CHECK (file_type IN ('image', 'video', 'document', 'audio'));

-- 2. RLS: авторизовані можуть редагувати свої коментарі
CREATE POLICY "Authors can update own comments" ON comments FOR UPDATE
  USING (auth.uid()::text = author_id);
