-- ==========================================
-- ONE-TIME RESET — ігрова статистика користувачів
-- ==========================================
-- Скидає прогрес/лідерборди всіх ігрових тулзів.
-- НЕ чіпає profiles, пости, лайки, пропозиції Brat TD тощо.
--
-- ВАЖЛИВО: brat_td_progress зануляється через UPDATE, а НЕ видаляється.
-- Клієнт Brat TD досі кешує прогрес у localStorage браузера. Якщо рядок
-- просто видалити, клієнт після рестарту трактує "немає рядка" як
-- "акаунт ще не грав" і сам перезаписує сервер старими локальними даними —
-- скидання миттєво "відновлюється". Залишаючи рядок із нульовими
-- значеннями, клієнт бачить явний серверний стан і довіряє йому.

TRUNCATE TABLE
  podro_clicker_progress,
  brat_td_tower_mastery,
  brat_td_achievements,
  brat_td_scores,
  hammer_hits,
  podro_nmt_results;

UPDATE brat_td_progress SET
  player_level = 1,
  total_xp = 0,
  unlocked_towers = ARRAY['hammer', 'boomerang'],
  achievements = ARRAY[]::TEXT[],
  bonus_start_gold = 0,
  bonus_lives = 0,
  map_completions = '{}'::JSONB,
  unlocked_titles = ARRAY[]::TEXT[],
  unlocked_frames = ARRAY[]::TEXT[],
  unlocked_effects = ARRAY[]::TEXT[],
  active_title = NULL,
  active_frame = NULL,
  active_effect = NULL,
  updated_at = now();
