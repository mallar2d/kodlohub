import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiJson } from "@/lib/api/response";

const LEADERBOARD_LIMIT = 50;

export const GET = withApiAuth(async (request) => {
  const admin = createAdminClient();

  const { data: topRows } = await admin
    .from("podro_nmt_results")
    .select("user_id, score, correct_answers, total_questions, time_taken_seconds, completed_at")
    .order("score", { ascending: false })
    .order("time_taken_seconds", { ascending: true })
    .limit(LEADERBOARD_LIMIT);

  const topIds = (topRows ?? []).map((r) => r.user_id);
  const profilesById = new Map<string, { username: string; display_name: string | null; avatar_url: string | null }>();

  if (topIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", topIds);
    for (const p of profiles ?? []) profilesById.set(p.id, p);
  }

  const leaderboard = (topRows ?? []).map((row) => {
    const p = profilesById.get(row.user_id);
    return { ...row, username: p?.username ?? null, display_name: p?.display_name ?? null, avatar_url: p?.avatar_url ?? null };
  });

  return apiJson(request, { leaderboard });
});

export const OPTIONS = GET;
