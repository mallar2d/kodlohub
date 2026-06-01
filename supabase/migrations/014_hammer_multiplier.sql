-- ==========================================
-- HAMMER MULTIPLIER — удар рівно о 22:00 = 22x
-- ==========================================

-- Додаємо стовпець множника (1 = звичайний удар, 22 = удар о 22:00)
ALTER TABLE hammer_hits ADD COLUMN IF NOT EXISTS multiplier INTEGER NOT NULL DEFAULT 1;

-- Оновлюємо leaderboard view щоб враховувати множник
CREATE OR REPLACE VIEW hammer_leaderboard AS
SELECT
  user_id,
  COALESCE(SUM(multiplier), 0)::BIGINT AS count
FROM hammer_hits
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY count DESC;

-- Оновлюємо унікальних хітерів
CREATE OR REPLACE FUNCTION hammer_unique_hitters()
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT user_id)::INTEGER FROM hammer_hits WHERE user_id IS NOT NULL;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Оновлюємо ранг з урахуванням множника
CREATE OR REPLACE FUNCTION hammer_user_rank(p_user_id TEXT)
RETURNS INTEGER AS $$
  WITH ranked AS (
    SELECT user_id, RANK() OVER (ORDER BY COALESCE(SUM(multiplier), 0) DESC) AS rank
    FROM hammer_hits
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  )
  SELECT rank::INTEGER FROM ranked WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Оновлюємо hammer_hit щоб приймав множник
CREATE OR REPLACE FUNCTION hammer_hit(p_user_id TEXT, p_multiplier INTEGER DEFAULT 1)
RETURNS TABLE(hit_at TIMESTAMPTZ, multiplier INTEGER) AS $$
DECLARE
  v_last TIMESTAMPTZ;
  v_now  TIMESTAMPTZ := now();
  v_mult INTEGER := GREATEST(COALESCE(p_multiplier, 1), 1);
BEGIN
  SELECT hit_at INTO v_last
  FROM hammer_hits
  WHERE user_id = p_user_id
  ORDER BY hit_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_last IS NOT NULL AND (v_now - v_last) < interval '1 hour' THEN
    RAISE EXCEPTION 'cooldown' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO hammer_hits (user_id, hit_at, multiplier) VALUES (p_user_id, v_now, v_mult);
  RETURN QUERY SELECT v_now, v_mult;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
