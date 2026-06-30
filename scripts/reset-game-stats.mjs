/**
 * Скидає ігрову статистику в Supabase (service role).
 * Запуск: node --env-file=.env.local scripts/reset-game-stats.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Потрібні NEXT_PUBLIC_SUPABASE_URL та SUPABASE_SERVICE_ROLE_KEY у .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** @type {{ table: string; filter: (q: ReturnType<typeof admin.from>) => ReturnType<typeof admin.from> }} */
const DELETE_TARGETS = [
  { table: "podro_clicker_progress", filter: (q) => q.neq("user_id", "") },
  { table: "brat_td_tower_mastery", filter: (q) => q.neq("user_id", "") },
  { table: "brat_td_achievements", filter: (q) => q.neq("user_id", "") },
  { table: "brat_td_scores", filter: (q) => q.neq("user_id", "") },
  { table: "hammer_hits", filter: (q) => q.gte("hit_at", "1970-01-01T00:00:00Z") },
  { table: "podro_nmt_results", filter: (q) => q.neq("user_id", "") },
];

console.log("Скидання ігрової статистики...\n");

for (const { table, filter } of DELETE_TARGETS) {
  const query = filter(admin.from(table).delete({ count: "exact" }));
  const { error, count } = await query;

  if (error) {
    console.error(`✕ ${table}: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${table}: видалено ${count ?? 0} записів`);
  }
}

// brat_td_progress зануляється через UPDATE, а не видаляється — інакше клієнт
// (через застарілий кеш у localStorage) сприймає "немає рядка" як
// "акаунт ще не грав" і сам перезаписує сервер старими локальними даними.
const { error: btdError, count: btdCount } = await admin
  .from("brat_td_progress")
  .update(
    {
      player_level: 1,
      total_xp: 0,
      unlocked_towers: ["hammer", "boomerang"],
      achievements: [],
      bonus_start_gold: 0,
      bonus_lives: 0,
      map_completions: {},
      unlocked_titles: [],
      unlocked_frames: [],
      unlocked_effects: [],
      active_title: null,
      active_frame: null,
      active_effect: null,
      updated_at: new Date().toISOString(),
    },
    { count: "exact" },
  )
  .neq("user_id", "");

if (btdError) {
  console.error(`✕ brat_td_progress: ${btdError.message}`);
  process.exitCode = 1;
} else {
  console.log(`✓ brat_td_progress: занулено ${btdCount ?? 0} записів`);
}

console.log("\nГотово.");
