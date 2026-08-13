-- Migration 035: Kava Games (Dice, Hammer) and Shop

-- 1. Dice Rooms & Rolls
CREATE TABLE IF NOT EXISTS dice_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_photo_url TEXT,
  joiner_id TEXT,
  joiner_name TEXT,
  joiner_photo_url TEXT,
  stake INTEGER NOT NULL CHECK (stake >= 1),
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'playing' | 'finished' | 'cancelled'
  current_turn TEXT,
  winner_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dice_rolls (
  id SERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES dice_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  roll_value INTEGER NOT NULL,
  player_total INTEGER NOT NULL,
  rolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Hammer Rooms & Actions
CREATE TABLE IF NOT EXISTS hammer_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_photo_url TEXT,
  joiner_id TEXT,
  joiner_name TEXT,
  joiner_photo_url TEXT,
  stake INTEGER NOT NULL CHECK (stake >= 1),
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'playing' | 'finished' | 'cancelled'
  round_index INTEGER NOT NULL DEFAULT 1,
  max_rounds INTEGER NOT NULL DEFAULT 5,
  distance_state TEXT NOT NULL DEFAULT 'short', -- 'short' | 'long'
  creator_hp INTEGER NOT NULL DEFAULT 100,
  joiner_hp INTEGER NOT NULL DEFAULT 100,
  creator_charges INTEGER NOT NULL DEFAULT 0,
  joiner_charges INTEGER NOT NULL DEFAULT 0,
  damage_creator INTEGER NOT NULL DEFAULT 0,
  damage_joiner INTEGER NOT NULL DEFAULT 0,
  winner_id TEXT,
  payout INTEGER NOT NULL DEFAULT 0,
  commission INTEGER NOT NULL DEFAULT 0,
  result_reason TEXT,
  round_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hammer_actions (
  id SERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES hammer_rooms(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'charge' | 'strike' | 'parry' | 'step'
  is_auto BOOLEAN NOT NULL DEFAULT FALSE,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  damage_to_creator INTEGER NOT NULL DEFAULT 0,
  damage_to_joiner INTEGER NOT NULL DEFAULT 0,
  creator_hp_before INTEGER,
  joiner_hp_before INTEGER,
  creator_hp_after INTEGER,
  joiner_hp_after INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, round_index, player_id)
);

-- 3. Shop Items & Purchases
CREATE TABLE IF NOT EXISTS kava_shop_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL,
  image_url TEXT,
  quantity INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kava_shop_purchases (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES kava_shop_items(id) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  username TEXT,
  first_name TEXT,
  item_title TEXT NOT NULL,
  item_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default shop items
INSERT INTO kava_shop_items (title, price, description, image_url, quantity, active)
VALUES
  ('нескафе голд', 1488, 'Славік особисто вручить тобі 50 грам золотистого нескафе', 'https://teas-cofe.com.ua/image/cache/catalog/product/nescafe-gold-50g-steclo-500x500.jpg', 1, TRUE),
  ('молоток славіка', 500, 'Легендарний реквізит для забивання баків та перемог у дуелях', NULL, 5, TRUE),
  ('VIP статус у боті', 300, 'Особливе виділення у лідерборді та пріоритетні завантаження', NULL, NULL, TRUE)
ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE dice_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE dice_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE hammer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hammer_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kava_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kava_shop_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for dice_rooms" ON dice_rooms FOR SELECT USING (true);
CREATE POLICY "Public read for dice_rolls" ON dice_rolls FOR SELECT USING (true);
CREATE POLICY "Public read for hammer_rooms" ON hammer_rooms FOR SELECT USING (true);
CREATE POLICY "Public read for hammer_actions" ON hammer_actions FOR SELECT USING (true);
CREATE POLICY "Public read for kava_shop_items" ON kava_shop_items FOR SELECT USING (true);
CREATE POLICY "Public read for kava_shop_purchases" ON kava_shop_purchases FOR SELECT USING (true);
