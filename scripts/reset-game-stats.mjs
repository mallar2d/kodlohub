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
const TARGETS = [
  { table: "podro_clicker_progress", filter: (q) => q.neq("user_id", "") },
  { table: "brat_td_progress", filter: (q) => q.neq("user_id", "") },
  { table: "brat_td_tower_mastery", filter: (q) => q.neq("user_id", "") },
  { table: "brat_td_achievements", filter: (q) => q.neq("user_id", "") },
  { table: "brat_td_scores", filter: (q) => q.neq("user_id", "") },
  { table: "hammer_hits", filter: (q) => q.gte("hit_at", "1970-01-01T00:00:00Z") },
  { table: "podro_nmt_results", filter: (q) => q.neq("user_id", "") },
];

console.log("Скидання ігрової статистики...\n");

for (const { table, filter } of TARGETS) {
  const query = filter(admin.from(table).delete({ count: "exact" }));
  const { error, count } = await query;

  if (error) {
    console.error(`✕ ${table}: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${table}: видалено ${count ?? 0} записів`);
  }
}

console.log("\nГотово.");
