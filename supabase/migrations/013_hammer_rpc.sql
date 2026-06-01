-- ==========================================
-- HAMMER HIT — atomic function (fixes TOCTOU race)
-- ==========================================

CREATE OR REPLACE FUNCTION hammer_hit(p_user_id TEXT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_last TIMESTAMPTZ;
  v_now  TIMESTAMPTZ := now();
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

  INSERT INTO hammer_hits (user_id, hit_at) VALUES (p_user_id, v_now);
  RETURN v_now;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leaderboard view for efficient aggregation
CREATE OR REPLACE VIEW hammer_leaderboard AS
SELECT
  user_id,
  COUNT(*) AS count
FROM hammer_hits
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY count DESC;

-- Unique hitters count
CREATE OR REPLACE FUNCTION hammer_unique_hitters()
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT user_id)::INTEGER FROM hammer_hits WHERE user_id IS NOT NULL;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- User rank by hit count
CREATE OR REPLACE FUNCTION hammer_user_rank(p_user_id TEXT)
RETURNS INTEGER AS $$
  WITH ranked AS (
    SELECT user_id, RANK() OVER (ORDER BY COUNT(*) DESC) AS rank
    FROM hammer_hits
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  )
  SELECT rank::INTEGER FROM ranked WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
