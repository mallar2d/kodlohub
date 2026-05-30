-- ==========================================
-- KODLOHOST — Approval system for Shemetovany
-- ==========================================

-- 1. Додати status до posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Оновити всі існуючі пости як approved
UPDATE posts SET status = 'approved' WHERE status IS NULL;

-- 2. Таблиця заявок на перехід в Кодло
CREATE TABLE IF NOT EXISTS join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES profiles(id)
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Користувачі бачать свої заявки
CREATE POLICY "Users see own join requests" ON join_requests FOR SELECT
  USING (auth.uid()::text = user_id);

-- Shemetovany можуть створювати заявки
CREATE POLICY "Shemetovany can create join requests" ON join_requests FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'shemetovany')
  );

-- Owner/podrofikovany бачать всі заявки
CREATE POLICY "Admins see all join requests" ON join_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

-- Owner/podrofikovany можуть змінювати статус заявок
CREATE POLICY "Admins can update join requests" ON join_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
  );

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON join_requests(user_id);
