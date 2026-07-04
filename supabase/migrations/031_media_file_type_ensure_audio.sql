-- ==========================================
-- KODLOHOST — Ensure media.file_type allows 'audio'
-- ==========================================
-- Re-asserts the constraint from 006 in case that migration was never applied
-- in an environment. Without 'audio' in the allow-list, any audio/voice upload
-- via /api/v1/media throws a check-constraint violation → HTTP 500.
-- Idempotent: safe to run repeatedly.

ALTER TABLE media DROP CONSTRAINT IF EXISTS media_file_type_check;
ALTER TABLE media ADD CONSTRAINT media_file_type_check
  CHECK (file_type IN ('image', 'video', 'document', 'audio'));
