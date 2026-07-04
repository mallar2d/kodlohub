import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiJson } from "@/lib/api/response";

const LEADERBOARD_LIMIT = 50;

type LeaderboardKind = "best_score" | "normal_wave" | "hard_wave" | "endless_wave" | "fastest_victory";

export const GET = withApiAuth(async (request) => {
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const leaderboardKind = (searchParams.get("leaderboard") ?? "best_score") as LeaderboardKind;

  let query = admin
    .from("brat_td_scores")
    .select("user_id, player_name, score, wave, created_at, difficulty, is_endless, duration_seconds, map_id")
    .limit(LEADERBOARD_LIMIT);

  if (leaderboardKind === "normal_wave") {
    query = query.eq("difficulty", "normal").order("wave", { ascending: false }).order("score", { ascending: false });
  } else if (leaderboardKind === "hard_wave") {
    query = query.eq("difficulty", "hard").order("wave", { ascending: false }).order("score", { ascending: false });
  } else if (leaderboardKind === "endless_wave") {
    query = query.eq("is_endless", true).order("wave", { ascending: false }).order("score", { ascending: false });
  } else if (leaderboardKind === "fastest_victory") {
    query = query.gte("wave", 46).not("duration_seconds", "is", null).order("duration_seconds", { ascending: true });
  } else {
    query = query.order("score", { ascending: false });
  }

  const { data: topRows } = await query;
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
    return { ...row, username: p?.username ?? null, display_name: p?.display_name ?? null, avatar_url: p?.avatar_url ?? null };
  });

  return apiJson(request, { leaderboard, kind: leaderboardKind });
});

export const OPTIONS = GET;
