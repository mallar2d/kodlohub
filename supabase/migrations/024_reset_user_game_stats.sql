-- ==========================================
-- ONE-TIME RESET — ігрова статистика користувачів
-- ==========================================
-- Скидає прогрес/лідерборди всіх ігрових тулзів.
-- НЕ чіпає profiles, пости, лайки, пропозиції Brat TD тощо.

TRUNCATE TABLE
  podro_clicker_progress,
  brat_td_progress,
  brat_td_tower_mastery,
  brat_td_achievements,
  brat_td_scores,
  hammer_hits,
  podro_nmt_results;
