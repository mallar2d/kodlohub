-- ==========================================
-- ONE-TIME RESET — ігрова статистика користувачів
-- ==========================================
-- Скидає прогрес/лідерборди всіх ігрових тулзів.
-- НЕ чіпає profiles, пости, лайки, пропозиції Brat TD тощо.
--
-- ВАЖЛИВО: podro_clicker_progress і brat_td_progress зануляються через UPDATE,
-- а НЕ видаляються. Відкриті вкладки та клієнтський кеш тримають старий стан;
-- якщо рядок просто видалити, PATCH upsert без валідації (немає existing)
-- або beforeunload-пуш відновлює прогрес миттєво. Явний нульовий рядок дає
-- серверу maxGain-валідацію і syncWithServer baseline для відкритих вкладок.

TRUNCATE TABLE
  brat_td_tower_mastery,
  brat_td_achievements,
  brat_td_scores,
  hammer_hits,
  podro_nmt_results;

UPDATE podro_clicker_progress SET
  grams = 0,
  career_grams = 0,
  total_clicks = 0,
  helpers = '{}'::JSONB,
  upgrades = ARRAY[]::TEXT[],
  achievements = ARRAY[]::TEXT[],
  respect_points = 0,
  prestige_count = 0,
  last_tick_at = now(),
  updated_at = now();

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
