-- ==========================================
-- KODLOHOST — Notifications + Coffee reminder
-- ==========================================

-- 1. Таблиця сповіщень
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

-- 2. RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Користувачі бачать тільки свої сповіщення
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT USING (auth.uid()::text = user_id);

-- Система може створювати сповіщення (authenticated)
CREATE POLICY "Authenticated can create notifications"
  ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Користувачі можуть позначати як прочитане
CREATE POLICY "Users can mark own as read"
  ON notifications FOR UPDATE USING (auth.uid()::text = user_id);

-- Користувачі можуть видаляти свої сповіщення
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE USING (auth.uid()::text = user_id);

-- 3. Індекс для швидкого пошуку
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
