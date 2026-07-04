import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

const LEADERBOARD_LIMIT = 10;

export const GET = withApiAuth(async (request) => {
  const admin = createAdminClient();

  const [{ data: totalData }, { data: uniqueHitters }, { data: topRows }] = await Promise.all([
    admin.from("hammer_hits").select("multiplier", { count: "exact" }),
    admin.rpc("hammer_unique_hitters"),
    admin.from("hammer_leaderboard").select("user_id, count").limit(LEADERBOARD_LIMIT),
  ]);

  const totalHits = (totalData ?? []).reduce(
    (sum: number, row: { multiplier: number }) => sum + (row.multiplier ?? 1),
    0
  );

  const topIds = (topRows ?? []).map((r: { user_id: string }) => r.user_id);
  const profilesById = new Map<string, { username: string; display_name: string | null; avatar_url: string | null }>();

  if (topIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", topIds);
    for (const p of profiles ?? []) profilesById.set(p.id, p);
  }

  const leaderboard = (topRows ?? []).map((row: { user_id: string; count: number }) => {
    const p = profilesById.get(row.user_id);
    return {
      user_id: row.user_id,
      count: row.count,
      username: p?.username ?? null,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });

  return apiJson(request, {
    totalHits,
    totalHitters: uniqueHitters ?? 0,
    leaderboard,
  });
});

export const OPTIONS = GET;
