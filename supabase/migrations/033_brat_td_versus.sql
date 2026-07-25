-- Brat TD 1.1 — Versus «Наїзд» matchmaking + event journal.
-- Client boards stay authoritative; Broadcast is the fast path, this table
-- is the reconnect replay source. Not rated — casual W/L only.

CREATE TABLE IF NOT EXISTS public.brat_td_versus_match (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a uuid NOT NULL,
  player_b uuid NOT NULL,
  map_id text NOT NULL,
  seed bigint NOT NULL DEFAULT 0,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'finished', 'cancelled')),
  winner uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CHECK (player_a <> player_b)
);

CREATE TABLE IF NOT EXISTS public.brat_td_versus_queue (
  user_id uuid PRIMARY KEY,
  map_id text NOT NULL,
  version text NOT NULL,
  enqueued_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.brat_td_versus_event (
  id bigserial PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.brat_td_versus_match(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  seq integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('send', 'status', 'defeat', 'forfeit')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, from_user_id, seq, kind)
);

CREATE INDEX IF NOT EXISTS idx_brat_td_versus_match_players
  ON public.brat_td_versus_match (player_a, player_b);
CREATE INDEX IF NOT EXISTS idx_brat_td_versus_match_active
  ON public.brat_td_versus_match (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brat_td_versus_event_match
  ON public.brat_td_versus_event (match_id, id);
CREATE INDEX IF NOT EXISTS idx_brat_td_versus_queue_enqueued
  ON public.brat_td_versus_queue (enqueued_at);

ALTER TABLE public.brat_td_versus_match ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brat_td_versus_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brat_td_versus_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brat_td_versus_match_select_own ON public.brat_td_versus_match;
CREATE POLICY brat_td_versus_match_select_own ON public.brat_td_versus_match
  FOR SELECT TO authenticated
  USING (auth.uid() = player_a OR auth.uid() = player_b);

DROP POLICY IF EXISTS brat_td_versus_queue_select_own ON public.brat_td_versus_queue;
CREATE POLICY brat_td_versus_queue_select_own ON public.brat_td_versus_queue
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS brat_td_versus_queue_delete_own ON public.brat_td_versus_queue;
CREATE POLICY brat_td_versus_queue_delete_own ON public.brat_td_versus_queue
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS brat_td_versus_event_select_own ON public.brat_td_versus_event;
CREATE POLICY brat_td_versus_event_select_own ON public.brat_td_versus_event
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brat_td_versus_match m
      WHERE m.id = match_id
        AND (m.player_a = auth.uid() OR m.player_b = auth.uid())
    )
  );

-- Direct inserts go through SECURITY DEFINER RPCs only.
DROP POLICY IF EXISTS brat_td_versus_event_no_direct_write ON public.brat_td_versus_event;
CREATE POLICY brat_td_versus_event_no_direct_write ON public.brat_td_versus_event
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.brat_td_versus_enqueue(p_map_id text, p_version text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $_$
DECLARE
  v_user_id uuid := auth.uid();
  v_version text;
  v_opponent public.brat_td_versus_queue%ROWTYPE;
  v_match_id uuid;
  v_seed bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth');
  END IF;

  IF p_map_id IS NULL OR p_map_id NOT IN ('yard', 'two-way', 'infinix-junction', 'quarry') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'map');
  END IF;

  IF p_version IS NULL OR octet_length(p_version) > 64 OR p_version !~ '^[A-Za-z0-9._:@+-]+$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'version');
  END IF;
  v_version := p_version;

  -- Already in an active match?
  SELECT id INTO v_match_id
  FROM public.brat_td_versus_match
  WHERE status = 'active'
    AND (player_a = v_user_id OR player_b = v_user_id)
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_match_id IS NOT NULL THEN
    RETURN (
      SELECT jsonb_build_object(
        'ok', true,
        'status', 'matched',
        'matchId', m.id,
        'mapId', m.map_id,
        'seed', m.seed,
        'version', m.version,
        'playerA', m.player_a,
        'playerB', m.player_b,
        'youAre', CASE WHEN m.player_a = v_user_id THEN 'a' ELSE 'b' END
      )
      FROM public.brat_td_versus_match m
      WHERE m.id = v_match_id
    );
  END IF;

  -- Rate limit enqueue churn.
  IF EXISTS (
    SELECT 1 FROM public.brat_td_versus_queue
    WHERE user_id = v_user_id
      AND enqueued_at > now() - interval '2 seconds'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'status', 'queued');
  END IF;

  DELETE FROM public.brat_td_versus_queue WHERE user_id = v_user_id;

  SELECT * INTO v_opponent
  FROM public.brat_td_versus_queue
  WHERE user_id <> v_user_id
    AND map_id = p_map_id
    AND version = v_version
    AND enqueued_at > now() - interval '2 minutes'
  ORDER BY enqueued_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    DELETE FROM public.brat_td_versus_queue WHERE user_id = v_opponent.user_id;
    v_seed := (extract(epoch from now()) * 1000)::bigint;
    INSERT INTO public.brat_td_versus_match (
      player_a, player_b, map_id, seed, version, status
    ) VALUES (
      v_opponent.user_id, v_user_id, p_map_id, v_seed, v_version, 'active'
    )
    RETURNING id INTO v_match_id;

    RETURN jsonb_build_object(
      'ok', true,
      'status', 'matched',
      'matchId', v_match_id,
      'mapId', p_map_id,
      'seed', v_seed,
      'version', v_version,
      'playerA', v_opponent.user_id,
      'playerB', v_user_id,
      'youAre', 'b'
    );
  END IF;

  INSERT INTO public.brat_td_versus_queue (user_id, map_id, version, enqueued_at)
  VALUES (v_user_id, p_map_id, v_version, now())
  ON CONFLICT (user_id) DO UPDATE
    SET map_id = EXCLUDED.map_id,
        version = EXCLUDED.version,
        enqueued_at = now();

  RETURN jsonb_build_object('ok', true, 'status', 'queued');
END;
$_$;

CREATE OR REPLACE FUNCTION public.brat_td_versus_dequeue()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $_$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  DELETE FROM public.brat_td_versus_queue WHERE user_id = v_user_id;
  RETURN true;
END;
$_$;

CREATE OR REPLACE FUNCTION public.brat_td_versus_post_event(
  p_match_id uuid,
  p_seq integer,
  p_kind text,
  p_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $_$
DECLARE
  v_user_id uuid := auth.uid();
  v_match public.brat_td_versus_match%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  IF p_match_id IS NULL OR p_seq IS NULL OR p_seq < 1 OR p_seq > 100000 THEN
    RETURN false;
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('send', 'status', 'defeat', 'forfeit') THEN
    RETURN false;
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN false;
  END IF;
  IF octet_length(p_payload::text) > 2048 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_match
  FROM public.brat_td_versus_match
  WHERE id = p_match_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_match.status <> 'active' THEN
    RETURN false;
  END IF;
  IF v_user_id <> v_match.player_a AND v_user_id <> v_match.player_b THEN
    RETURN false;
  END IF;

  -- Soft rate limit: max ~4 events/sec/user/match excluding status spam via unique seq.
  IF (
    SELECT count(*) FROM public.brat_td_versus_event
    WHERE match_id = p_match_id
      AND from_user_id = v_user_id
      AND created_at > now() - interval '1 second'
      AND kind <> 'status'
  ) > 6 THEN
    RETURN false;
  END IF;

  INSERT INTO public.brat_td_versus_event (match_id, from_user_id, seq, kind, payload)
  VALUES (p_match_id, v_user_id, p_seq, p_kind, p_payload)
  ON CONFLICT (match_id, from_user_id, seq, kind) DO NOTHING;

  IF p_kind IN ('defeat', 'forfeit') THEN
    UPDATE public.brat_td_versus_match
    SET status = 'finished',
        ended_at = now(),
        winner = CASE
          WHEN p_kind = 'forfeit' THEN
            CASE WHEN v_user_id = player_a THEN player_b ELSE player_a END
          ELSE
            CASE WHEN v_user_id = player_a THEN player_b ELSE player_a END
        END,
        reason = p_kind
    WHERE id = p_match_id AND status = 'active';
  END IF;

  RETURN true;
END;
$_$;

CREATE OR REPLACE FUNCTION public.brat_td_versus_report(
  p_match_id uuid,
  p_result text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $_$
DECLARE
  v_user_id uuid := auth.uid();
  v_match public.brat_td_versus_match%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  IF p_result IS NULL OR p_result NOT IN ('win', 'loss', 'draw', 'forfeit') THEN
    RETURN false;
  END IF;

  SELECT * INTO v_match
  FROM public.brat_td_versus_match
  WHERE id = p_match_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_user_id <> v_match.player_a AND v_user_id <> v_match.player_b THEN
    RETURN false;
  END IF;
  IF v_match.status <> 'active' THEN
    RETURN true;
  END IF;

  UPDATE public.brat_td_versus_match
  SET status = 'finished',
      ended_at = now(),
      winner = CASE
        WHEN p_result = 'win' THEN v_user_id
        WHEN p_result = 'loss' THEN
          CASE WHEN v_user_id = player_a THEN player_b ELSE player_a END
        WHEN p_result = 'forfeit' THEN
          CASE WHEN v_user_id = player_a THEN player_b ELSE player_a END
        ELSE NULL
      END,
      reason = p_result
  WHERE id = p_match_id AND status = 'active';

  RETURN true;
END;
$_$;

REVOKE ALL ON FUNCTION public.brat_td_versus_enqueue(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.brat_td_versus_dequeue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.brat_td_versus_post_event(uuid, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.brat_td_versus_report(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.brat_td_versus_enqueue(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.brat_td_versus_dequeue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.brat_td_versus_post_event(uuid, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.brat_td_versus_report(uuid, text) TO authenticated;

-- Realtime broadcast channels are client-named (`versus:{matchId}`).
-- Optional table replication for match status reconnect:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.brat_td_versus_match;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
