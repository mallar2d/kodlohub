-- ==========================================
-- KAVA & TELEGRAM SYNC — Зв'язок облікових записів та синхронізація Кави
-- ==========================================

-- 1. Додавання полів Telegram та кешу Кави до profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kava_balance_cache INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kava_last_claim_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kava_total_claims INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);

-- 2. Одноразові токени для прив'язки через @podroid_bot deep-link
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telegram_link_tokens_owner" ON telegram_link_tokens;
CREATE POLICY "telegram_link_tokens_owner" ON telegram_link_tokens
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 3. Кеш глобального лідерборду Кави
CREATE TABLE IF NOT EXISTS kava_cached_leaderboard (
  telegram_id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL DEFAULT 0,
  first_name TEXT,
  username TEXT,
  photo_url TEXT,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kava_cached_leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kava_leaderboard_public_read" ON kava_cached_leaderboard;
CREATE POLICY "kava_leaderboard_public_read" ON kava_cached_leaderboard
  FOR SELECT
  USING (true);

-- 4. Лог транзакцій та клеймів Кави
CREATE TABLE IF NOT EXISTS kava_transactions_log (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  amount_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kava_transactions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kava_transactions_user_read" ON kava_transactions_log;
CREATE POLICY "kava_transactions_user_read" ON kava_transactions_log
  FOR SELECT
  USING (
    auth.uid()::text = user_id OR
    telegram_id IN (SELECT telegram_id FROM profiles WHERE id = auth.uid()::text)
  );
