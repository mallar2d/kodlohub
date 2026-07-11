-- ==========================================
-- KODLO ARENA / HALF BRAT integration
-- ==========================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS game_nick TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_game_nick_lower
  ON profiles (lower(game_nick))
  WHERE game_nick IS NOT NULL AND game_nick <> '';

-- Short-lived pairing codes shown in the Godot client.
CREATE TABLE IF NOT EXISTS arena_pair_codes (
  code TEXT PRIMARY KEY,
  poll_token TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  game_token_plain TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_pair_expires ON arena_pair_codes(expires_at);

ALTER TABLE arena_pair_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access to arena_pair_codes" ON arena_pair_codes;
CREATE POLICY "No direct client access to arena_pair_codes" ON arena_pair_codes FOR ALL USING (false);

-- Long-lived user-scoped game tokens (ka_live_...).
CREATE TABLE IF NOT EXISTS arena_game_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'HALF BRAT',
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_game_tokens_hash
  ON arena_game_tokens(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_arena_game_tokens_user
  ON arena_game_tokens(user_id) WHERE revoked_at IS NULL;

ALTER TABLE arena_game_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access to arena_game_tokens" ON arena_game_tokens;
CREATE POLICY "No direct client access to arena_game_tokens" ON arena_game_tokens FOR ALL USING (false);

-- Aggregate career stats.
CREATE TABLE IF NOT EXISTS kodlo_arena_stats (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  frags INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  matches INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  playtime_seconds INTEGER NOT NULL DEFAULT 0,
  favorite_map TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kodlo_arena_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Arena stats viewable by everyone" ON kodlo_arena_stats;
CREATE POLICY "Arena stats viewable by everyone" ON kodlo_arena_stats FOR SELECT USING (true);
DROP POLICY IF EXISTS "No direct writes to arena stats" ON kodlo_arena_stats;
CREATE POLICY "No direct writes to arena stats" ON kodlo_arena_stats FOR ALL USING (false);

-- Match history.
CREATE TABLE IF NOT EXISTS kodlo_arena_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  map_id TEXT NOT NULL,
  mode_id TEXT NOT NULL DEFAULT 'ffa',
  frags INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL DEFAULT 'aborted',
  client_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT kodlo_arena_matches_result_check
    CHECK (result IN ('win', 'loss', 'draw', 'aborted'))
);

CREATE INDEX IF NOT EXISTS idx_kodlo_arena_matches_user_created
  ON kodlo_arena_matches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kodlo_arena_matches_frags
  ON kodlo_arena_matches(frags DESC);

ALTER TABLE kodlo_arena_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Arena matches viewable by everyone" ON kodlo_arena_matches;
CREATE POLICY "Arena matches viewable by everyone" ON kodlo_arena_matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "No direct writes to arena matches" ON kodlo_arena_matches;
CREATE POLICY "No direct writes to arena matches" ON kodlo_arena_matches FOR ALL USING (false);

-- Allow owners/users to update their own game_nick via normal profile RLS if present.
-- profiles already has user update policies from earlier migrations.
