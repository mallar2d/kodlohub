import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiJson } from "@/lib/api/response";

const LEADERBOARD_LIMIT = 20;

export const GET = withApiAuth(async (request) => {
  const admin = createAdminClient();

  const { data: topRows } = await admin
    .from("podro_clicker_leaderboard")
    .select("user_id, career_grams, respect_points, prestige_count")
    .gt("career_grams", 0)
    .limit(LEADERBOARD_LIMIT);

  const topIds = [...new Set((topRows ?? []).map((r) => r.user_id))];
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
    return {
      user_id: row.user_id,
      career_grams: Number(row.career_grams ?? 0),
      respect_points: Number(row.respect_points ?? 0),
      prestige_count: row.prestige_count ?? 0,
      username: p?.username ?? null,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });

  return apiJson(request, { leaderboard });
});

export const OPTIONS = GET;
